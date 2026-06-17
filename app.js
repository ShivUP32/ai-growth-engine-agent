/**
 * app.js
 *
 * Client-side only. Never touches the Groq API key — every model call
 * goes through POST /api/agent, which holds the key server-side.
 * See docs/AGENT_FLOWS.md for the request/response contract and
 * docs/DESIGN.md for the status-dot / layout rationale.
 */

// Mirrors AGENT_ORDER and field needs in api/prompts.js. Keep in sync.
const AGENT_UI_CONFIG = [
  {
    key: "market-intel",
    code: "AGENT 01",
    title: "Market Intelligence",
    description:
      "Maps the competitive landscape and surfaces the content and category gaps this company can own.",
    fields: [
      {
        id: "extraContext",
        label: "Extra context the team already knows (optional)",
        type: "textarea",
        placeholder:
          "e.g. recent funding round, new product launch, a competitor's recent campaign...",
      },
    ],
  },
  {
    key: "linkedin-content",
    code: "AGENT 02",
    title: "LinkedIn Content Strategy",
    description:
      "Drafts company-page posts, founder posts, a carousel outline, and comment starters for manual review and posting.",
    fields: [
      {
        id: "topic",
        label: "This week's content pillar / topic",
        type: "text",
        default: "Why AI voice agents reduce prior-authorization turnaround time",
      },
      {
        id: "proofPoints",
        label: "Verified proof points to reference (optional — leave blank rather than risk invented numbers)",
        type: "textarea",
        placeholder: "e.g. SOC 2 Type II attested, HIPAA compliant",
      },
      {
        row: [
          { id: "companyPostCount", label: "Company posts", type: "number", default: 3 },
          { id: "founderPostCount", label: "Founder posts", type: "number", default: 4 },
          { id: "commentCount", label: "Comment starters", type: "number", default: 5 },
        ],
      },
    ],
  },
  {
    key: "geo-visibility",
    code: "AGENT 03",
    title: "GEO/AEO/ASO Audit",
    description:
      "Existing blog audit, new content brief, AI-engine testing, schema and CTA recommendations.",
    fields: [
      {
        id: "query",
        label: "Target query to win",
        type: "text",
        default: "AI agents for revenue cycle management",
      },
      {
        id: "blogUrls",
        label: "Existing blog/page URLs to audit",
        type: "textarea",
        placeholder: "Paste one URL per line"
      },
      {
        id: "searchConsoleNotes",
        label: "Google Search Console notes (optional)",
        type: "textarea"
      },
      {
        id: "ga4Notes",
        label: "GA4 notes (optional)",
        type: "textarea"
      },
      {
        id: "manualAiEngineResults",
        label: "Manual AI-engine test notes (optional)",
        type: "textarea"
      }
    ],
  },
  {
    key: "growth-report",
    code: "AGENT 04",
    title: "Growth Measurement & Report",
    description:
      "Turns this week's manually exported metrics into a pacing calculation and three safe experiments for next week.",
    fields: [
      {
        id: "weeklyMetrics",
        label: "This week's metrics (paste from LinkedIn analytics / GA4 / CRM)",
        type: "textarea",
        placeholder: "e.g. +85 new followers, top post: prior-auth carousel at 4,200 impressions",
      },
      {
        id: "topContent",
        label: "Top performing content this week (optional)",
        type: "text",
      },
      {
        id: "aiVisibilityNotes",
        label: "AI-engine visibility check notes (optional)",
        type: "textarea",
        placeholder: "e.g. ChatGPT mentioned a competitor but not us for 'AI prior auth'",
      },
    ],
  },
  {
    key: "citation-authority",
    code: "AGENT 05",
    title: "Citation Authority",
    description: "Finds third-party directories, roundups, partner pages, podcasts, webinars, and trust assets that can improve AI-engine citation potential.",
    fields: [
      { id: "targetSources", label: "Known sources or categories to prioritize", type: "textarea" },
      { id: "approvedProof", label: "Approved proof points / trust claims", type: "textarea" }
    ]
  },
  {
    key: "conversion-repurposing",
    code: "AGENT 06",
    title: "Conversion + Repurposing",
    description: "Maps visibility into CTAs, conversion assets, lead magnets, reports, webinars, and reusable content packs.",
    fields: [
      { id: "assetType", label: "Source asset type", type: "select", options: ["Blog", "Webinar", "Report", "Case study", "Comparison page", "Checklist", "ROI calculator"] },
      { id: "sourceAsset", label: "Source asset summary or URL", type: "textarea" }
    ]
  }
];

// Stores the latest successful result per agent, for copy/download actions.
const agentState = {};
let lastGrowthPack = null;

// ---------------- Small DOM helpers ----------------

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

// ---------------- Card rendering ----------------

function fieldHtml(f, agentKey) {
  const idAttr = `field-${agentKey}-${f.id}`;
  const labelText = escapeHtml(f.label);
  if (f.type === "textarea") {
    return `<label class="field"><span>${labelText}</span><textarea id="${idAttr}" placeholder="${escapeAttr(
      f.placeholder || ""
    )}">${escapeHtml(f.default || "")}</textarea></label>`;
  }
  if (f.type === "number") {
    return `<label class="field"><span>${labelText}</span><input type="number" id="${idAttr}" value="${
      f.default ?? 0
    }" min="0" /></label>`;
  }
  if (f.type === "select") {
    const optionsHtml = (f.options || []).map(opt => `<option value="${escapeAttr(opt)}">${escapeHtml(opt)}</option>`).join("");
    return `<label class="field"><span>${labelText}</span><select id="${idAttr}">${optionsHtml}</select></label>`;
  }
  return `<label class="field"><span>${labelText}</span><input type="text" id="${idAttr}" value="${escapeAttr(
    f.default || ""
  )}" placeholder="${escapeAttr(f.placeholder || "")}" /></label>`;
}

function renderFields(fields, agentKey) {
  return fields
    .map((f) => {
      if (f.row) {
        return `<div class="field-row">${f.row.map((sub) => fieldHtml(sub, agentKey)).join("")}</div>`;
      }
      return fieldHtml(f, agentKey);
    })
    .join("");
}

function cardHtml(cfg) {
  return `
    <article class="agent-card" data-agent="${cfg.key}">
      <div class="agent-card-header">
        <div class="agent-card-title">
          <p class="eyebrow">${cfg.code}</p>
          <h3>${escapeHtml(cfg.title)}</h3>
          <p>${escapeHtml(cfg.description)}</p>
        </div>
        <span class="status-dot" data-dot="${cfg.key}" data-state="idle" title="Idle"></span>
      </div>
      <div class="agent-card-fields">
        ${renderFields(cfg.fields, cfg.key)}
      </div>
      <div class="agent-card-actions">
        <button class="btn btn-primary btn-small" data-run="${cfg.key}">Run agent</button>
        <button class="btn btn-small" data-copy="${cfg.key}" disabled>Copy</button>
        <button class="btn btn-small" data-download="${cfg.key}" disabled>Download .md</button>
      </div>
      <p class="agent-card-meta" data-meta="${cfg.key}"></p>
      <div class="agent-error" data-error="${cfg.key}"></div>
      <div class="agent-output" data-output="${cfg.key}"></div>
    </article>`;
}

function renderConsole() {
  const consoleEl = document.getElementById("console");
  consoleEl.innerHTML = AGENT_UI_CONFIG.map(cardHtml).join("");
}

// ---------------- Reading form state ----------------

function getCompanyProfile() {
  return {
    companyName: val("f-companyName"),
    website: val("f-website"),
    icp: val("f-icp"),
    persona: val("f-persona"),
    tone: val("f-tone"),
    competitors: val("f-competitors"),
    currentFollowers: Number(val("f-currentFollowers")) || 0,
    followerGoal: Number(val("f-followerGoal")) || 0,
    daysRemaining: Number(val("f-daysRemaining")) || 0,
  };
}

function getAgentInputs(agentKey) {
  const cfg = AGENT_UI_CONFIG.find((c) => c.key === agentKey);
  const inputs = {};
  if (!cfg) return inputs;
  const flatFields = [];
  cfg.fields.forEach((f) => (f.row ? flatFields.push(...f.row) : flatFields.push(f)));
  flatFields.forEach((f) => {
    const el = document.getElementById(`field-${agentKey}-${f.id}`);
    if (!el) return;
    inputs[f.id] = f.type === "number" ? Number(el.value) || 0 : el.value.trim();
  });
  return inputs;
}

// ---------------- Status / error UI ----------------

function setStatus(agentKey, state, metaText) {
  const dot = document.querySelector(`[data-dot="${agentKey}"]`);
  if (dot) {
    dot.dataset.state = state;
    dot.title = state.charAt(0).toUpperCase() + state.slice(1);
  }
  if (metaText !== undefined) {
    const meta = document.querySelector(`[data-meta="${agentKey}"]`);
    if (meta) meta.textContent = metaText;
  }
}

function showError(agentKey, message) {
  const el = document.querySelector(`[data-error="${agentKey}"]`);
  if (el) {
    el.textContent = message;
    el.classList.add("visible");
  }
}

function clearError(agentKey) {
  const el = document.querySelector(`[data-error="${agentKey}"]`);
  if (el) {
    el.textContent = "";
    el.classList.remove("visible");
  }
}

function enableOutputActions(agentKey) {
  const copyBtn = document.querySelector(`[data-copy="${agentKey}"]`);
  const dlBtn = document.querySelector(`[data-download="${agentKey}"]`);
  if (copyBtn) copyBtn.disabled = false;
  if (dlBtn) dlBtn.disabled = false;
}

// ---------------- Minimal Markdown -> HTML renderer ----------------
// Deliberately small: the system prompts in api/prompts.js fully control
// output structure (headers, tables, lists, one disclaimer line), so this
// only needs to handle that fixed subset — not arbitrary Markdown.

function applyInline(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function isSeparatorRow(line) {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line);
}

function splitRow(line) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function renderTable(tableLines) {
  if (!tableLines.length) return "";
  const headerCells = splitRow(tableLines[0]);
  let bodyLines = tableLines.slice(1);
  if (bodyLines.length && isSeparatorRow(bodyLines[0])) bodyLines = bodyLines.slice(1);

  let html = "<table><thead><tr>";
  headerCells.forEach((c) => (html += `<th>${applyInline(c)}</th>`));
  html += "</tr></thead><tbody>";
  bodyLines.forEach((l) => {
    const cells = splitRow(l);
    html += "<tr>" + cells.map((c) => `<td>${applyInline(c)}</td>`).join("") + "</tr>";
  });
  html += "</tbody></table>\n";
  return html;
}

function renderMarkdown(raw) {
  const escaped = escapeHtml(raw).replace(/\r\n/g, "\n");
  const lines = escaped.split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    let m = trimmed.match(/^(#{2,3})\s+(.*)$/);
    if (m) {
      const level = m[1].length === 2 ? "h2" : "h3";
      html += `<${level}>${applyInline(m[2])}</${level}>\n`;
      i++;
      continue;
    }

    m = trimmed.match(/^_(.+)_$/);
    if (m) {
      html += `<p class="disclaimer">${applyInline(m[1])}</p>\n`;
      i++;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      html += renderTable(tableLines);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      html += "<ul>" + items.map((it) => `<li>${applyInline(it)}</li>`).join("") + "</ul>\n";
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      html += "<ol>" + items.map((it) => `<li>${applyInline(it)}</li>`).join("") + "</ol>\n";
      continue;
    }

    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{2,3}\s+/.test(lines[i].trim()) &&
      !/^\|/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^_(.+)_$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    html += `<p>${applyInline(paraLines.join(" "))}</p>\n`;
  }

  return html;
}

function renderOutput(agentKey, data) {
  const el = document.querySelector(`[data-output="${agentKey}"]`);
  if (!el) return;
  let html = "";
  if (data.fallbackUsed && (agentKey === "market-intel" || agentKey === "geo-visibility" || agentKey === "citation-authority")) {
    html += `<div class="output-note">Live web search was unavailable, so this result used model knowledge only. Verify recency manually.</div>`;
  } else if (data.note) {
    html += `<div class="output-note">${escapeHtml(data.note)}</div>`;
  }
  html += renderMarkdown(data.markdown);
  el.innerHTML = html;
  el.classList.add("visible");
}

// Pulls the body of a single "## Heading" section out of an agent's
// Markdown output, so it can be forwarded as context into the next agent.
function extractSection(markdown, headings) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let capturing = false;
  const out = [];
  const headingList = Array.isArray(headings) ? headings : [headings];
  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(/^#{2,6}\s+(.*)$/);
    if (headerMatch) {
      if (capturing) break;
      const headingText = headerMatch[1].trim().toLowerCase();
      if (headingList.some(h => headingText.includes(h.toLowerCase()))) {
        capturing = true;
      }
      continue;
    }
    if (capturing) out.push(line);
  }
  return out.join("\n").trim();
}

// ---------------- Calling the agent endpoint ----------------

async function callAgent(agentKey, extraInputs = {}) {
  clearError(agentKey);
  const company = getCompanyProfile();

  if (!company.companyName) {
    setStatus(agentKey, "error", "Missing company name");
    showError(agentKey, "Company name is required in the Company Profile panel above.");
    throw new Error("companyProfile.companyName is required.");
  }

  setStatus(agentKey, "running", "Calling Groq…");
  const inputs = Object.assign({}, getAgentInputs(agentKey), extraInputs);

  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentType: agentKey, companyProfile: company, agentInputs: inputs }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}.`);
    }

    agentState[agentKey] = { markdown: data.markdown, model: data.model, fallbackUsed: data.fallbackUsed };
    renderOutput(agentKey, data);
    enableOutputActions(agentKey);

    const fallbackStr = data.fallbackUsed ? "yes" : "no";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const metaText = `MODEL: ${data.model} · FALLBACK: ${fallbackStr} · GENERATED: ${year}-${month}-${day} ${hours}:${minutes}`;
    setStatus(agentKey, "done", metaText);

    return data.markdown;
  } catch (err) {
    setStatus(agentKey, "error", "Failed");
    showError(agentKey, err.message || "Something went wrong calling the agent.");
    throw err;
  }
}

// ---------------- Copy / download actions ----------------

function downloadMarkdown(filename, content) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function flashButtonLabel(btn, text) {
  const original = btn.textContent;
  btn.textContent = text;
  setTimeout(() => {
    btn.textContent = original;
  }, 1400);
}

function wireCardActions() {
  document.getElementById("console").addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const runKey = target.dataset.run;
    const copyKey = target.dataset.copy;
    const dlKey = target.dataset.download;

    if (runKey) {
      target.disabled = true;
      try {
        await callAgent(runKey);
      } catch {
        // error already shown inline on the card
      } finally {
        target.disabled = false;
      }
      return;
    }

    if (copyKey) {
      const state = agentState[copyKey];
      if (!state) return;
      try {
        await navigator.clipboard.writeText(state.markdown);
        flashButtonLabel(target, "Copied");
      } catch {
        flashButtonLabel(target, "Copy failed");
      }
      return;
    }

    if (dlKey) {
      const state = agentState[dlKey];
      if (state) downloadMarkdown(`${dlKey}.md`, state.markdown);
    }
  });
}

// ---------------- Full sprint orchestration ----------------

function setAllRunButtonsDisabled(disabled) {
  document.querySelectorAll("[data-run]").forEach((b) => (b.disabled = disabled));
}

async function runFullSprint() {
  const sprintBtn = document.getElementById("run-sprint-btn");
  const statusEl = document.getElementById("sprint-status");
  const dlBtn = document.getElementById("sprint-download-btn");

  sprintBtn.disabled = true;
  setAllRunButtonsDisabled(true);
  dlBtn.style.display = "none";

  const company = getCompanyProfile();
  const dateStr = new Date().toISOString().slice(0, 10);
  const combined = [`# Safe AI Growth Sprint Pack — ${dateStr}`, `Company: ${company.companyName || "Untitled"}`, ""];

  try {
    statusEl.textContent = "Running Agent 01 — Market Intelligence…";
    const marketMd = await callAgent("market-intel");
    const gaps = extractSection(marketMd, ["gaps", "category gaps"]);
    const angles = extractSection(marketMd, ["angles", "differentiation angles"]);
    const narrative = extractSection(marketMd, ["narrative", "category narrative"]);
    const competitiveContext = gaps;
    combined.push("## 1. Market Intelligence + Share of Voice", "", marketMd, "");

    statusEl.textContent = "Running Agent 02 — LinkedIn Content Strategy…";
    const contentMd = await callAgent("linkedin-content", { competitiveContext, gaps, angles, narrative });
    combined.push("## 2. LinkedIn Content + Founder Growth", "", contentMd, "");

    statusEl.textContent = "Running Agent 03 — GEO/AEO/ASO Audit…";
    const geoMd = await callAgent("geo-visibility", { competitiveContext, gaps, angles, narrative });
    combined.push("## 3. GEO/AEO/ASO Blog Audit + Content Brief", "", geoMd, "");

    statusEl.textContent = "Running Agent 04 — Growth Measurement & Report…";
    const reportMd = await callAgent("growth-report");
    combined.push("## 4. Growth Measurement + Forecasting", "", reportMd, "");

    statusEl.textContent = "Running Agent 05 — Citation Authority…";
    const citationMd = await callAgent("citation-authority", { gaps, angles, narrative });
    combined.push("## 5. Third-Party Citation + Authority", "", citationMd, "");

    statusEl.textContent = "Running Agent 06 — Conversion + Repurposing…";
    const conversionMd = await callAgent("conversion-repurposing", { gaps, angles, narrative });
    combined.push("## 6. Conversion Asset + Repurposing", "", conversionMd, "");

    // Add Human Review Checklist
    combined.push(
      "## 7. Human Review Checklist",
      "",
      "- [ ] Read through all drafts to ensure the tone fits the company's voice.",
      "- [ ] Verify that all metrics, facts, and figures in the drafts are accurate and verified.",
      "- [ ] Insert actual metrics/evidence in place of any placeholder text like `[insert verified metric]`.",
      "- [ ] Check links and calls-to-action (CTAs) to ensure they resolve to the correct destination pages.",
      ""
    );

    // Add Compliance Checklist
    combined.push(
      "## 8. Compliance Checklist",
      "",
      "- [ ] Confirm no automated LinkedIn posting, scheduling, or scraping tools are used.",
      "- [ ] Verify no protected health information (PHI) or personal patient data is included in any post or brief.",
      "- [ ] Confirm that no claims (medical, clinical, compliance, ROI) are made without explicit, verifiable proof.",
      "- [ ] Ensure manual execution of all public-facing outreach and posts.",
      ""
    );

    lastGrowthPack = combined.join("\n");
    downloadMarkdown(`growth-pack-${dateStr}.md`, lastGrowthPack);

    dlBtn.style.display = "inline-block";
    dlBtn.onclick = () => downloadMarkdown(`growth-pack-${dateStr}.md`, lastGrowthPack);

    statusEl.textContent = "Sprint complete — combined growth-pack-" + dateStr + ".md downloaded.";
  } catch (err) {
    statusEl.textContent = `Sprint stopped: ${err.message || "an agent failed"}. Review the error on the card above, then re-run that agent or the full sprint again.`;
  } finally {
    sprintBtn.disabled = false;
    setAllRunButtonsDisabled(false);
  }
}

// ---------------- Boot ----------------

document.addEventListener("DOMContentLoaded", () => {
  renderConsole();
  wireCardActions();
  document.getElementById("run-sprint-btn").addEventListener("click", runFullSprint);
});
