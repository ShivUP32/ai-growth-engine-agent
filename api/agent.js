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
    // This should only happen if the env var was never set in Vercel.
    return res.status(500).json({
      ok: false,
      error:
        "GROQ_API_KEY is not configured on the server. Add it in Vercel → Project → Settings → Environment Variables, then redeploy. See docs/VERCEL_ENV_SETUP.md.",
    });
  }

  const config = AGENT_CONFIG[agentType];
  const userPrompt = config.buildUserPrompt(companyProfile, agentInputs || {});
  const messages = [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
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
      executedTools: primary.executedTools || [],
    });
  } catch (primaryErr) {
    if (!config.fallbackModel) {
      return res.status(502).json({ ok: false, error: `Groq API error: ${primaryErr.message}` });
    }
    try {
      const fallback = await callGroq({
        apiKey,
        model: config.fallbackModel,
        messages,
        temperature: config.temperature,
        maxCompletionTokens: config.maxCompletionTokens,
      });
      const response = {
        ok: true,
        markdown: fallback.content,
        model: config.fallbackModel,
        fallbackUsed: true,
        executedTools: [],
      };
      if (config.model.includes("compound")) {
        response.note =
          "Live web search was unavailable, so this used the model's existing knowledge only — verify recency manually.";
      }
      return res.status(200).json(response);
    } catch (fallbackErr) {
      return res.status(502).json({
        ok: false,
        error: `Groq API error on both primary and fallback model: ${fallbackErr.message}`,
      });
    }
  }
}

async function callGroq({ apiKey, model, messages, temperature, maxCompletionTokens }) {
  const response = await fetch(GROQ_ENDPOINT, {
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
  });

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
