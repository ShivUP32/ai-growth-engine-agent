/**
 * api/agent.js
 *
 * Vercel serverless function. This is the ONLY place in the project that
 * touches the Groq API key. The browser never sees the key — it only ever
 * calls this endpoint, which reads process.env.GROQ_API_KEY on the server.
 *
 * See docs/VERCEL_ENV_SETUP.md for how to set GROQ_API_KEY safely.
 * See docs/AGENT_FLOWS.md for the request/response contract this implements.
 *
 * POST /api/agent
 * body: { agentType: string, companyProfile: object, agentInputs: object }
 * 200: { ok: true, markdown: string, model: string, fallbackUsed: boolean, executedTools: array }
 * 4xx/5xx: { ok: false, error: string }
 */

import { AGENT_CONFIG } from "./prompts.js";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Simple in-memory cache for Jina scrape and search results (max 50 entries)
const jinaCache = new Map();

function cleanCacheIfFull() {
  if (jinaCache.size > 50) {
    console.log("[Cache] Clearing Jina cache (exceeded 50 items)");
    jinaCache.clear();
  }
}

// Fetch helper with timeout support using AbortController
async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Extract URLs from a string
function extractUrls(str) {
  if (!str) return [];
  const urlRegex = /(https?:\/\/[^\s,;]+)/g;
  return str.match(urlRegex) || [];
}

// Scrape a URL using Jina Reader
async function scrapeUrl(url, apiKey) {
  if (!url) return "";
  const cacheKey = `scrape:${url}`;
  if (jinaCache.has(cacheKey)) {
    console.log(`[Cache Hit] Reusing scraped content for: ${url}`);
    return jinaCache.get(cacheKey);
  }

  const headers = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  const response = await fetchWithTimeout(`https://r.jina.ai/${encodeURI(url)}`, { headers }, 1800);
  if (!response.ok) {
    throw new Error(`Jina Reader returned status ${response.status}`);
  }
  const text = await response.text();
  cleanCacheIfFull();
  jinaCache.set(cacheKey, text);
  return text;
}

// Search using Jina Search with optional JSON formatting to retrieve raw search engine snippets/metadata
async function searchWeb(query, apiKey, jsonResponse = false) {
  if (!query) return "";
  const cacheKey = `search:${query}:${jsonResponse}`;
  if (jinaCache.has(cacheKey)) {
    console.log(`[Cache Hit] Reusing search results for: "${query}" (json=${jsonResponse})`);
    return jinaCache.get(cacheKey);
  }

  if (!apiKey) {
    throw new Error("JINA_API_KEY is not configured. Jina Search requires an API key.");
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`
  };
  if (jsonResponse) {
    headers["Accept"] = "application/json";
  }

  const response = await fetchWithTimeout(`https://s.jina.ai/${encodeURIComponent(query)}`, {
    headers
  }, 1800);

  if (!response.ok) {
    throw new Error(`Jina Search returned status ${response.status}`);
  }

  let text = "";
  if (jsonResponse) {
    try {
      const data = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        let resultsText = "";
        data.data.forEach((item, index) => {
          resultsText += `\n[Result ${index + 1}]\n`;
          resultsText += `Title: ${item.title || "No Title"}\n`;
          resultsText += `URL: ${item.url || "No URL"}\n`;
          resultsText += `Snippet/Summary: ${item.description || "No description available"}\n`;
          resultsText += `---\n`;
        });
        text = resultsText.trim();
      }
    } catch (err) {
      console.warn("[Jina Search] Failed to parse JSON response, falling back to text:", err.message);
    }
  }

  if (!text) {
    text = await response.text();
  }

  cleanCacheIfFull();
  jinaCache.set(cacheKey, text);
  return text;
}

// Model mapping helper to translate Groq model names to OpenRouter equivalents
function getOpenRouterModel(groqModel) {
  const mappings = {
    "llama-3.3-70b-versatile": "meta-llama/llama-3.3-70b-instruct",
    "llama-3.1-8b-instant": "meta-llama/llama-3.1-8b-instruct",
    "mixtral-8x7b-32768": "mistralai/mixtral-8x7b-instruct",
  };
  return mappings[groqModel] || "meta-llama/llama-3.3-70b-instruct";
}

// Call OpenRouter API
async function callOpenRouter({ apiKey, model, messages, temperature, maxTokens, isFallbackCall = false }) {
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ai-growth-engine-agent.vercel.app",
        "X-Title": "VoiceCare AI Safe Growth Engine",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    }, 6000); // 6 seconds timeout for OpenRouter

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status} from OpenRouter model "${model}": ${errorBody.slice(0, 300)}`);
    }

    const data = await response.json();
    const choice = data.choices && data.choices[0];
    const content = choice && choice.message ? choice.message.content : "";

    if (!content) {
      throw new Error(`OpenRouter model "${model}" returned an empty response.`);
    }

    return { content, model };
  } catch (err) {
    console.error(`[OpenRouter] Call failed for model "${model}":`, err.message);

    // Only run fallback if it's not already a fallback call, and the target is llama-3.3-70b-versatile/instruct
    if (isFallbackCall || (model !== "meta-llama/llama-3.3-70b-instruct" && model !== "llama-3.3-70b-versatile")) {
      throw err;
    }

    console.log(`[OpenRouter Fallback Chain] Primary model "${model}" failed. Triggering sequential multi-model fallback chain...`);

    const fallbackList = [
      // 1. Gemini free API (best available)
      "google/gemini-2.5-flash:free",
      "google/gemini-2.5-pro:free",
      "google/gemini-2.0-flash-exp:free",
      "google/gemini-flash-1.5-8b:free",
      "google/gemini-1.5-flash:free",
      "google/gemini-1.5-pro:free",

      // 2. GPT-OSS-120B by OpenAI
      "openai/gpt-oss-120b",
      "openai/gpt-oss-120b:free",

      // 3. Nemotron 3 Nano 30B A3B
      "nvidia/nemotron-3-nano-30b-a3b:free",
      "nvidia/nemotron-3-nano-30b-a3b"
    ];

    let lastError = err;
    for (const fbModel of fallbackList) {
      try {
        console.log(`[OpenRouter Fallback Chain] Trying fallback model "${fbModel}"...`);
        const res = await callOpenRouter({
          apiKey,
          model: fbModel,
          messages,
          temperature,
          maxTokens,
          isFallbackCall: true // prevent recursion
        });
        console.log(`[OpenRouter Fallback Chain] Success! Used fallback model "${fbModel}"`);
        return { content: res.content, model: `${fbModel} (OpenRouter Fallback)` };
      } catch (fbErr) {
        console.error(`[OpenRouter Fallback Chain] Fallback model "${fbModel}" failed:`, fbErr.message);
        lastError = fbErr;
      }
    }

    throw new Error(`All models in OpenRouter fallback chain failed. Last error: ${lastError.message}`);
  }
}

// Helper wrapper to try Groq first, and if failed, try OpenRouter fallback
async function callGroqOrOpenRouter({ apiKey, orApiKey, model, messages, temperature, maxCompletionTokens }) {
  try {
    const res = await callGroq({ apiKey, model, messages, temperature, maxCompletionTokens });
    return { content: res.content, provider: "Groq", model: model, executedTools: res.executedTools };
  } catch (groqErr) {
    console.error(`[Groq] Failed for model "${model}":`, groqErr.message);
    if (!orApiKey) {
      throw groqErr;
    }
    const orModel = getOpenRouterModel(model);
    try {
      console.log(`[OpenRouter] Falling back to OpenRouter model "${orModel}"`);
      const res = await callOpenRouter({ apiKey: orApiKey, model: orModel, messages, temperature, maxTokens: maxCompletionTokens });
      let finalModelName = res.model || orModel;
      if (!finalModelName.includes("OpenRouter")) {
        finalModelName = `${finalModelName} (OpenRouter)`;
      }
      return { content: res.content, provider: "OpenRouter", model: finalModelName };
    } catch (orErr) {
      console.error(`[OpenRouter] Failed for model "${orModel}":`, orErr.message);
      throw new Error(`Groq failed (${groqErr.message}) and OpenRouter failed (${orErr.message})`);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "Request body must be valid JSON." });
    }
  }

  const { agentType, companyProfile, agentInputs } = body || {};

  if (!agentType || !AGENT_CONFIG[agentType]) {
    return res.status(400).json({
      ok: false,
      error: `Unknown agentType "${agentType}". Expected one of: ${Object.keys(AGENT_CONFIG).join(", ")}.`,
    });
  }
  if (!companyProfile || !companyProfile.companyName) {
    return res.status(400).json({ ok: false, error: "companyProfile.companyName is required." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error:
        "GROQ_API_KEY is not configured on the server. Add it in Vercel → Project → Settings → Environment Variables, then redeploy. See docs/VERCEL_ENV_SETUP.md.",
    });
  }

  const config = AGENT_CONFIG[agentType];
  const jinaApiKey = process.env.JINA_API_KEY;

  let scrapedPages = [];
  let searchBlocks = [];
  let jinaSucceeded = false;
  const executedTools = [];

  // 1. Run Jina search/scraping workflows based on agentType
  try {
    if (agentType === "market-intel") {
      const competitors = companyProfile.competitors || "";
      const compList = competitors.split(",").map(c => c.trim()).filter(Boolean).slice(0, 3);
      
      const queries = [
        { q: `${companyProfile.companyName} vs ${competitors} category positioning share of voice`.trim(), json: false }
      ];
      for (const comp of compList) {
        queries.push({ q: `"${comp}" linkedin content topics OR authority news OR citation directories`, json: false });
      }

      const searchPromises = queries.map(async (item) => {
        try {
          console.log(`[Jina] Running search for market-intel: "${item.q}" (json=${item.json})`);
          const results = await searchWeb(item.q, jinaApiKey, item.json);
          if (results) {
            searchBlocks.push(`### Search Results for: "${item.q}"\n\n${results}`);
            executedTools.push(`Jina Search ("${item.q}")`);
            jinaSucceeded = true;
          }
        } catch (err) {
          console.error(`[Jina] Search failed for market-intel query "${item.q}":`, err.message);
        }
      });

      await Promise.all(searchPromises);
    } else if (agentType === "geo-visibility") {
      const blogUrlsStr = agentInputs.blogUrls || "";
      const urlsToScrape = extractUrls(blogUrlsStr).slice(0, 3);
      
      const scrapePromises = urlsToScrape.map(async (url) => {
        try {
          console.log(`[Jina] Scraping blog URL: ${url}`);
          const content = await scrapeUrl(url, jinaApiKey);
          if (content) {
            scrapedPages.push(`### Scraped Content from: ${url}\n\n${content}`);
            executedTools.push(`Jina Reader (${url})`);
            jinaSucceeded = true;
          }
        } catch (err) {
          console.error(`[Jina] Scraping failed for ${url}:`, err.message);
        }
      });

      const targetQuery = agentInputs.query || "";
      let searchPromise = Promise.resolve();
      if (targetQuery) {
        searchPromise = (async () => {
          try {
            console.log(`[Jina] Running search for geo-visibility: "${targetQuery}"`);
            const results = await searchWeb(targetQuery, jinaApiKey);
            if (results) {
              searchBlocks.push(results);
              executedTools.push("Jina Search");
              jinaSucceeded = true;
            }
          } catch (err) {
            console.error(`[Jina] Search failed for geo-visibility:`, err.message);
          }
        })();
      }

      await Promise.all([...scrapePromises, searchPromise]);
    } else if (agentType === "citation-authority") {
      const query = `top B2B directories listings and categories for ${companyProfile.icp}`.trim();
      try {
        console.log(`[Jina] Running search for citation-authority: "${query}"`);
        const results = await searchWeb(query, jinaApiKey);
        if (results) {
          searchBlocks.push(results);
          executedTools.push("Jina Search");
          jinaSucceeded = true;
        }
      } catch (err) {
        console.error(`[Jina] Search failed for citation-authority:`, err.message);
      }
    } else if (agentType === "linkedin-content") {
      const topic = agentInputs.topic || "";
      if (topic) {
        const query = `${topic} ${companyProfile.icp || ""} industry news trends`.trim();
        try {
          console.log(`[Jina] Running search for linkedin-content: "${query}"`);
          const results = await searchWeb(query, jinaApiKey);
          if (results) {
            searchBlocks.push(results);
            executedTools.push("Jina Search");
            jinaSucceeded = true;
          }
        } catch (err) {
          console.error(`[Jina] Search failed for linkedin-content:`, err.message);
        }
      }
    } else if (agentType === "conversion-repurposing") {
      const sourceAssetStr = agentInputs.sourceAsset || "";
      const urlsToScrape = extractUrls(sourceAssetStr).slice(0, 3);
      
      const scrapePromises = urlsToScrape.map(async (url) => {
        try {
          console.log(`[Jina] Scraping conversion source asset: ${url}`);
          const content = await scrapeUrl(url, jinaApiKey);
          if (content) {
            scrapedPages.push(`### Scraped Content from: ${url}\n\n${content}`);
            executedTools.push(`Jina Reader (${url})`);
            jinaSucceeded = true;
          }
        } catch (err) {
          console.error(`[Jina] Scraping failed for conversion source asset ${url}:`, err.message);
        }
      });

      await Promise.all(scrapePromises);
    } else if (agentType === "growth-report") {
      const query = `"${companyProfile.companyName}" news OR presence OR directories`.trim();
      try {
        console.log(`[Jina] Running search for growth-report: "${query}"`);
        const results = await searchWeb(query, jinaApiKey);
        if (results) {
          searchBlocks.push(results);
          executedTools.push("Jina Search");
          jinaSucceeded = true;
        }
      } catch (err) {
        console.error(`[Jina] Search failed for growth-report:`, err.message);
      }
    }
  } catch (err) {
    console.error("[Jina] Major error during Jina integration flow:", err.message);
  }

  // 2. Assemble prompt grounding context
  let groundedContext = "";
  if (scrapedPages.length > 0) {
    groundedContext += `\n\n<scraped_web_pages>\n${scrapedPages.join("\n\n")}\n</scraped_web_pages>\n`;
  }
  if (searchBlocks.length > 0) {
    groundedContext += `\n\n<search_results>\n${searchBlocks.join("\n\n")}\n</search_results>\n`;
  }
  if (groundedContext) {
    groundedContext += `\n\n[INSTRUCTION] Analyze and incorporate the real-time search results and scraped webpage contents above into your analysis and recommendations.`;
  }

  const userPrompt = config.buildUserPrompt(companyProfile, agentInputs || {}) + groundedContext;
  const messages = [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // 3. Model routing and fallback execution
  if (config.model === "groq/compound") {
    if (jinaSucceeded) {
      // Grounding succeeded, execute using fallbackModel as primary and mark fallbackUsed = false
      try {
        console.log(`[Model Route] Grounding succeeded. Running primary model: ${config.fallbackModel}`);
        const primary = await callGroqOrOpenRouter({
          apiKey,
          orApiKey: process.env.OPENROUTER_API_KEY,
          model: config.fallbackModel,
          messages,
          temperature: config.temperature,
          maxCompletionTokens: config.maxCompletionTokens,
        });
        return res.status(200).json({
          ok: true,
          markdown: primary.content,
          model: primary.model,
          fallbackUsed: false,
          executedTools: executedTools,
        });
      } catch (primaryErr) {
        console.error(`[Model Route] Grounded model failed:`, primaryErr.message);
        return res.status(502).json({
          ok: false,
          error: `API error on grounded model: ${primaryErr.message}`,
        });
      }
    } else {
      // Grounding failed or was bypassed, execute using fallbackModel and mark fallbackUsed = true
      try {
        console.log(`[Model Route] Grounding failed/bypassed. Running fallback model: ${config.fallbackModel}`);
        const fallback = await callGroqOrOpenRouter({
          apiKey,
          orApiKey: process.env.OPENROUTER_API_KEY,
          model: config.fallbackModel,
          messages,
          temperature: config.temperature,
          maxCompletionTokens: config.maxCompletionTokens,
        });
        return res.status(200).json({
          ok: true,
          markdown: fallback.content,
          model: fallback.model,
          fallbackUsed: true,
          executedTools: [],
          note: "Live web search was unavailable, so this used the model's existing knowledge only — verify recency manually.",
        });
      } catch (fallbackErr) {
        return res.status(502).json({
          ok: false,
          error: `API error on fallback model (search failed): ${fallbackErr.message}`,
        });
      }
    }
  } else {
    // Standard model execution
    try {
      console.log(`[Model Route] Running standard model: ${config.model}`);
      const primary = await callGroq({
        apiKey,
        model: config.model,
        messages,
        temperature: config.temperature,
        maxCompletionTokens: config.maxCompletionTokens,
      });
      return res.status(200).json({
        ok: true,
        markdown: primary.content,
        model: config.model,
        fallbackUsed: false,
        executedTools: executedTools,
      });
    } catch (primaryErr) {
      if (!config.fallbackModel) {
        if (process.env.OPENROUTER_API_KEY) {
          try {
            const orModel = getOpenRouterModel(config.model);
            console.log(`[Model Route] Standard model failed. Running OpenRouter model: ${orModel}`);
            const fallback = await callOpenRouter({
              apiKey: process.env.OPENROUTER_API_KEY,
              model: orModel,
              messages,
              temperature: config.temperature,
              maxTokens: config.maxCompletionTokens,
            });
            let finalModelName = fallback.model || orModel;
            if (!finalModelName.includes("OpenRouter")) {
              finalModelName = `${finalModelName} (OpenRouter)`;
            }
            return res.status(200).json({
              ok: true,
              markdown: fallback.content,
              model: finalModelName,
              fallbackUsed: true,
              executedTools: [],
            });
          } catch (orErr) {
            return res.status(502).json({
              ok: false,
              error: `Groq error (${primaryErr.message}) and OpenRouter error (${orErr.message})`,
            });
          }
        }
        return res.status(502).json({ ok: false, error: `Groq API error: ${primaryErr.message}` });
      }
      try {
        console.log(`[Model Route] Standard model failed. Running fallback model: ${config.fallbackModel}`);
        const fallback = await callGroqOrOpenRouter({
          apiKey,
          orApiKey: process.env.OPENROUTER_API_KEY,
          model: config.fallbackModel,
          messages,
          temperature: config.temperature,
          maxCompletionTokens: config.maxCompletionTokens,
        });
        return res.status(200).json({
          ok: true,
          markdown: fallback.content,
          model: fallback.model,
          fallbackUsed: true,
          executedTools: [],
        });
      } catch (fallbackErr) {
        return res.status(502).json({
          ok: false,
          error: `API error on both primary and fallback models: ${fallbackErr.message}`,
        });
      }
    }
  }
}

async function callGroq({ apiKey, model, messages, temperature, maxCompletionTokens }) {
  const response = await fetchWithTimeout(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_completion_tokens: maxCompletionTokens,
    }),
  }, 6000); // 6 seconds timeout for Groq

  if (!response.ok) {
    const errorBody = await response.text();
    const retryAfter = response.headers.get("retry-after");
    const suffix = retryAfter ? ` (retry after ${retryAfter}s)` : "";
    throw new Error(`HTTP ${response.status} from model "${model}"${suffix}: ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const choice = data.choices && data.choices[0];
  const content = choice && choice.message ? choice.message.content : "";
  const executedTools = choice && choice.message ? choice.message.executed_tools : undefined;

  if (!content) {
    throw new Error(`Model "${model}" returned an empty response.`);
  }

  return { content, executedTools };
}

