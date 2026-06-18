/**
 * app.js
 *
 * Figma / n8n-Style Interactive Console Orchestrator
 *
 * Client-side only. Coordinates zoom/pan event listeners, calculates and
 * draws SVG connection lines between agent node ports, and manages the
 * sequential agent execution pipeline.
 */

// Mirror of the agent order in api/prompts.js
const AGENT_ORDER = [
  "market-intel",
  "linkedin-content",
  "geo-visibility",
  "growth-report",
  "citation-authority",
  "conversion-repurposing",
];

// Absolute node coordinates on the vast canvas (in pixels)
const NODE_POSITIONS = {
  "profile": { left: 50, top: 150 },
  "market-intel": { left: 490, top: 150 },
  "linkedin-content": { left: 960, top: 50 },
  "geo-visibility": { left: 960, top: 480 },
  "growth-report": { left: 490, top: 760 },
  "citation-authority": { left: 960, top: 1120 },
  "conversion-repurposing": { left: 1430, top: 480 },
  "sprint": { left: 1900, top: 480 }
};

// SVG visual wiring mapping (port output -> port input)
const CONNECTIONS = [
  { from: "profile-out", to: "market-intel-in" },
  { from: "profile-out", to: "growth-report-in" },
  { from: "market-intel-out", to: "linkedin-content-in" },
  { from: "market-intel-out", to: "geo-visibility-in" },
  { from: "market-intel-out", to: "citation-authority-in" },
  { from: "market-intel-out", to: "conversion-repurposing-in" },
  { from: "linkedin-content-out", to: "conversion-repurposing-in" },
  { from: "growth-report-out", to: "citation-authority-in" },
  { from: "market-intel-out", to: "sprint-in" },
  { from: "linkedin-content-out", to: "sprint-in" },
  { from: "geo-visibility-out", to: "sprint-in" },
  { from: "growth-report-out", to: "sprint-in" },
  { from: "citation-authority-out", to: "sprint-in" },
  { from: "conversion-repurposing-out", to: "sprint-in" }
];

const AGENT_UI_CONFIG = [
  {
    key: "market-intel",
    code: "AGENT 01",
    title: "Market + Share of Voice",
    description: "Competitors, category gaps, ranking visibility, and weekly narrative.",
    stage: "research",
    fields: [
      {
        id: "extraContext",
        label: "Extra context the team already knows (optional)",
        type: "textarea",
        placeholder: "e.g. recent funding round, new product launch, a competitor's campaign...",
      },
    ],
  },
  {
    key: "linkedin-content",
    code: "AGENT 02",
    title: "LinkedIn + Founder Growth",
    description: "Company posts, founder posts, employee advocacy, carousel outlines, and comment starters.",
    stage: "execution",
    fields: [
      {
        id: "topic",
        label: "This week's content pillar / topic",
        type: "text",
        default: "Why AI voice agents reduce prior-authorization turnaround time",
      },
      {
        id: "proofPoints",
        label: "Verified proof points to reference (optional)",
        type: "textarea",
        placeholder: "e.g. SOC 2 Type II attested, HIPAA compliant, 85% success rate",
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
    description: "Existing blog audits, new content briefs, AI engine citation testing, and schema recommendations.",
    stage: "execution",
    fields: [
      {
        id: "query",
        label: "Target query to win",
        type: "text",
        default: "AI agents for revenue cycle management",
      },
      {
        id: "blogUrls",
        label: "Existing blog/page URLs to audit (one per line)",
        type: "textarea",
        placeholder: "e.g. https://voicecare.ai/blog/improving-rcm"
      },
      {
        id: "searchConsoleNotes",
        label: "Google Search Console notes (optional)",
        type: "textarea",
        placeholder: "e.g. ranking on page 2 for 'healthcare billing automation'"
      },
      {
        id: "manualAiEngineResults",
        label: "Manual AI-engine test notes (optional)",
        type: "textarea",
        placeholder: "e.g. ChatGPT cites competitor X but excludes VoiceCare AI for priority queries"
      }
    ],
  },
  {
    key: "growth-report",
    code: "AGENT 04",
    title: "Growth Forecast",
    description: "Pace calculations, reverse follower targets, visibility indexes, and weekly experiments.",
    stage: "research",
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
    description: "Discovers third-party directories, directories, partner sites, and trust asset needs.",
    stage: "execution",
    fields: [
      {
        id: "targetSources",
        label: "Known sources or categories to prioritize (optional)",
        type: "textarea",
        placeholder: "e.g. Capterra, healthcare tech listings, regional provider directories..."
      },
      {
        id: "approvedProof",
        label: "Approved trust/security claims (optional)",
        type: "textarea",
        placeholder: "e.g. SOC 2 Type II attested, HIPAA self-audit complete"
      }
    ]
  },
  {
    key: "conversion-repurposing",
    code: "AGENT 06",
    title: "Conversion + Repurposing",
    description: "CTA mapping, webinar/report magnets, comparison pages, and repurposing matrices.",
    stage: "execution",
    fields: [
      {
        id: "assetType",
        label: "Source asset type",
        type: "select",
        options: ["Blog", "Webinar", "Report", "Case study", "Comparison page", "Checklist", "ROI calculator"]
      },
      {
        id: "sourceAsset",
        label: "Source asset details / summary (optional)",
        type: "textarea",
        placeholder: "Paste url, description, or content overview here..."
      }
    ]
  }
];

// Canvas transforms
let scale = 0.62; // Fit all elements nicely on typical screens
let panX = 60;
let panY = 40;
let isDragging = false;
let startX, startY;

// Track active agent states for drawing animated connection lines
const runningAgents = {};
const completedAgents = { "profile": true }; // Inputs are always marked active/complete

// Store the latest successful result per agent, for copy/download actions.
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
  
  if (f.type === "select") {
    const optionsHtml = f.options.map(opt => `<option value="${escapeAttr(opt)}">${escapeHtml(opt)}</option>`).join("");
    return `<label class="field"><span>${labelText}</span><select id="${idAttr}">${optionsHtml}</select></label>`;
  }
  
  if (f.type === "number") {
    return `<label class="field"><span>${labelText}</span><input type="number" id="${idAttr}" value="${
      f.default ?? 0
    }" min="0" /></label>`;
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
  const pos = NODE_POSITIONS[cfg.key] || { left: 0, top: 0 };
  return `
    <article class="canvas-node agent-node" data-agent="${cfg.key}" data-stage="${cfg.stage || "research"}" style="left: ${pos.left}px; top: ${pos.top}px;">
      <!-- Input Port -->
      <div class="port port-in" data-port="${cfg.key}-in" title="${cfg.title} Input"></div>
      
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
        <button class="btn btn-primary btn-small" data-run="${cfg.key}">Run Agent</button>
        <button class="btn btn-small" data-view="${cfg.key}" disabled>View Output</button>
      </div>
      <p class="agent-card-meta" data-meta="${cfg.key}"></p>
      <div class="agent-error" data-error="${cfg.key}"></div>

      <!-- Output Port -->
      <div class="port port-out" data-port="${cfg.key}-out" title="${cfg.title} Output"></div>
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
  
  // Toggle the pulsing state on the node card itself
  const nodeEl = document.querySelector(`[data-agent="${agentKey}"]`) || document.getElementById(`node-${agentKey}`);
  if (nodeEl) {
    if (state === "running") {
      nodeEl.classList.add("running");
    } else {
      nodeEl.classList.remove("running");
    }
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
  const viewBtn = document.querySelector(`[data-view="${agentKey}"]`);
  if (viewBtn) viewBtn.disabled = false;
}

// ---------------- Minimal Markdown -> HTML renderer ----------------

function applyInline(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function isSeparatorRow(line) {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line);
}

// Fix split row to make sure it handles empty arrays and cleans correctly
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
  openDrawer(agentKey);
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

  // Set visual flow lines and card states to active/running
  runningAgents[agentKey] = true;
  completedAgents[agentKey] = false;
  drawWires();

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
    
    // Set visual flow lines and card states to completed
    runningAgents[agentKey] = false;
    completedAgents[agentKey] = true;
    drawWires();

    setStatus(agentKey, "done", metaText);

    return data.markdown;
  } catch (err) {
    runningAgents[agentKey] = false;
    drawWires();
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
    const viewKey = target.dataset.view;

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

    if (viewKey) {
      openDrawer(viewKey);
      return;
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
  const viewBtn = document.getElementById("sprint-view-btn");

  sprintBtn.disabled = true;
  setAllRunButtonsDisabled(true);
  dlBtn.style.display = "none";
  if (viewBtn) viewBtn.style.display = "none";

  runningAgents["sprint"] = true;
  completedAgents["sprint"] = false;
  drawWires();

  const company = getCompanyProfile();
  const dateStr = new Date().toISOString().slice(0, 10);
  const combined = [`# AI Growth Sprint Pack — ${dateStr}`, `Company: ${company.companyName || "Untitled"}`, ""];

  try {
    statusEl.textContent = "Running Agent 01 — Market Intelligence + Share of Voice…";
    const marketMd = await callAgent("market-intel");
    const gaps = extractSection(marketMd, ["gaps", "category gaps"]);
    const angles = extractSection(marketMd, ["angles", "differentiation angles"]);
    const narrative = extractSection(marketMd, ["narrative", "category narrative"]);
    const competitiveContext = gaps;
    combined.push("## 1. Market Intelligence + Share of Voice", "", marketMd, "");

    statusEl.textContent = "Running Agent 02 — LinkedIn + Founder Growth…";
    const contentMd = await callAgent("linkedin-content", { competitiveContext, gaps, angles, narrative });
    combined.push("## 2. LinkedIn + Founder Growth", "", contentMd, "");

    statusEl.textContent = "Running Agent 03 — GEO/AEO/ASO Audit…";
    const geoMd = await callAgent("geo-visibility", { competitiveContext, gaps, angles, narrative });
    combined.push("## 3. GEO/AEO/ASO Blog Audit + Content Brief", "", geoMd, "");

    statusEl.textContent = "Running Agent 04 — Growth Forecast…";
    const reportMd = await callAgent("growth-report");
    combined.push("## 4. Growth Forecast", "", reportMd, "");

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

    if (viewBtn) {
      viewBtn.style.display = "inline-block";
      viewBtn.onclick = () => openDrawer("sprint");
    }

    runningAgents["sprint"] = false;
    completedAgents["sprint"] = true;
    drawWires();

    statusEl.textContent = "Sprint complete — combined growth-pack-" + dateStr + ".md downloaded.";
    
    // Automatically open drawer
    openDrawer("sprint");
  } catch (err) {
    runningAgents["sprint"] = false;
    drawWires();
    statusEl.textContent = `Sprint stopped: ${err.message || "an agent failed"}. Review the error on the card above, then re-run that agent or the full sprint again.`;
  } finally {
    sprintBtn.disabled = false;
    setAllRunButtonsDisabled(false);
  }
}

// ---------------- SVG visual wiring ----------------

function drawWires() {
  const svg = document.getElementById("canvas-svg");
  if (!svg) return;

  const container = document.getElementById("canvas-container");
  const containerRect = container.getBoundingClientRect();

  // Clear previous paths
  svg.innerHTML = "";

  CONNECTIONS.forEach((conn, index) => {
    const elFrom = document.querySelector(`[data-port="${conn.from}"]`);
    const elTo = document.querySelector(`[data-port="${conn.to}"]`);

    if (!elFrom || !elTo) return;

    const rFrom = elFrom.getBoundingClientRect();
    const rTo = elTo.getBoundingClientRect();

    // Remove scale impact so coordinates map correctly in absolute canvas pixels
    const x1 = (rFrom.left + rFrom.width / 2 - containerRect.left) / scale;
    const y1 = (rFrom.top + rFrom.height / 2 - containerRect.top) / scale;
    const x2 = (rTo.left + rTo.width / 2 - containerRect.left) / scale;
    const y2 = (rTo.top + rTo.height / 2 - containerRect.top) / scale;

    // Curved cubic bezier math
    const dx = Math.abs(x2 - x1) * 0.45;
    const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "wire");
    path.setAttribute("id", `wire-${index}`);

    const fromAgent = conn.from.split("-out")[0];
    const toAgent = conn.to.split("-in")[0];

    // Determine state color class
    if (runningAgents[fromAgent] || runningAgents[toAgent] || (runningAgents["sprint"] && !completedAgents[toAgent])) {
      path.classList.add("active");
    } else if (completedAgents[fromAgent] && completedAgents[toAgent]) {
      path.classList.add("completed");
    } else if (completedAgents[fromAgent]) {
      path.classList.add("source-completed");
    }

    svg.appendChild(path);
  });
}

// Node Dragging State variables
let draggedNode = null;
let dragStartX = 0;
let dragStartY = 0;
let nodeInitialLeft = 0;
let nodeInitialTop = 0;

// Current viewed output key in drawer
let currentDrawerAgentKey = null;

// ---------------- Canvas Zoom & Pan Engine ----------------

function initCanvas() {
  const viewport = document.getElementById("canvas-viewport");
  
  // Set initial position
  updateTransform();

  // Mouse Down handler - handles canvas pan & card dragging
  viewport.addEventListener("mousedown", (e) => {
    // 1. Check if clicking on a node header (drag handle)
    const dragHandle = e.target.closest(".node-header, .agent-card-header");
    if (dragHandle) {
      // Prevent drag initiation on button/input click inside headers
      if (e.target.closest("button") || e.target.closest("input") || e.target.closest("select") || e.target.closest("textarea")) {
        return;
      }
      const node = dragHandle.closest(".canvas-node");
      if (node) {
        draggedNode = node;
        draggedNode.classList.add("dragging");
        
        nodeInitialLeft = parseFloat(draggedNode.style.left) || 0;
        nodeInitialTop = parseFloat(draggedNode.style.top) || 0;
        
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        e.stopPropagation();
        e.preventDefault();
        return;
      }
    }

    // 2. Prevent dragging background if clicking interface nodes, buttons, or drawers
    if (
      e.target.closest(".canvas-node") ||
      e.target.closest(".canvas-controls") ||
      e.target.closest(".site-header") ||
      e.target.closest(".site-footer") ||
      e.target.closest(".output-drawer")
    ) {
      return;
    }
    isDragging = true;
    viewport.style.cursor = "grabbing";
    startX = e.clientX - panX;
    startY = e.clientY - panY;
  });

  // Mouse Move handler
  window.addEventListener("mousemove", (e) => {
    if (draggedNode) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      
      // Scale coordinates by current zoom factor
      const scaledDx = dx / scale;
      const scaledDy = dy / scale;
      
      const newLeft = nodeInitialLeft + scaledDx;
      const newTop = nodeInitialTop + scaledDy;
      
      draggedNode.style.left = `${newLeft}px`;
      draggedNode.style.top = `${newTop}px`;
      
      // Update coordinates cache
      const nodeKey = draggedNode.dataset.agent || draggedNode.id.replace("node-", "");
      if (NODE_POSITIONS[nodeKey]) {
        NODE_POSITIONS[nodeKey].left = newLeft;
        NODE_POSITIONS[nodeKey].top = newTop;
      } else {
        NODE_POSITIONS[nodeKey] = { left: newLeft, top: newTop };
      }
      
      drawWires();
      e.preventDefault();
      return;
    }

    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
  });

  // Mouse Up handler
  window.addEventListener("mouseup", () => {
    if (draggedNode) {
      draggedNode.classList.remove("dragging");
      draggedNode = null;
    }
    if (isDragging) {
      isDragging = false;
      viewport.style.cursor = "grab";
    }
  });

  // Trackpad Swiping (Panning) & Pinch-to-Zoom Gesture Support
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();

    // Zoom conditions:
    const isZoom = e.ctrlKey || e.metaKey;

    if (isZoom) {
      const zoomIntensity = 0.0075;
      let newScale = scale - e.deltaY * zoomIntensity;
      newScale = Math.min(2.0, Math.max(0.15, newScale));

      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const localX = (mouseX - panX) / scale;
      const localY = (mouseY - panY) / scale;

      scale = newScale;
      panX = mouseX - localX * scale;
      panY = mouseY - localY * scale;
    } else {
      panX -= e.deltaX;
      panY -= e.deltaY;
    }

    updateTransform();
  }, { passive: false });

  // Floating Control Listeners
  document.getElementById("ctrl-zoom-in").addEventListener("click", () => {
    scale = Math.min(2.0, scale + 0.08);
    updateTransform();
  });

  document.getElementById("ctrl-zoom-out").addEventListener("click", () => {
    scale = Math.max(0.2, scale - 0.08);
    updateTransform();
  });

  document.getElementById("ctrl-zoom-reset").addEventListener("click", () => {
    scale = 0.62;
    panX = 60;
    panY = 40;
    updateTransform();
  });

  document.getElementById("ctrl-zoom-fit").addEventListener("click", () => {
    scale = 0.42;
    panX = 20;
    panY = 50;
    updateTransform();
  });
}

function updateTransform() {
  const container = document.getElementById("canvas-container");
  if (container) {
    container.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }
  // Re-draw wires on updates
  drawWires();
}

// ---------------- Output Drawer Controller ----------------

function openDrawer(agentKey) {
  const drawer = document.getElementById("output-drawer");
  const eyebrow = document.getElementById("drawer-eyebrow");
  const title = document.getElementById("drawer-title");
  const body = document.getElementById("drawer-body");
  const copyBtn = document.getElementById("drawer-copy-btn");
  const dlBtn = document.getElementById("drawer-download-btn");

  currentDrawerAgentKey = agentKey;

  let state;
  let code = "";
  let name = "";
  let markdown = "";
  let fallbackUsed = false;
  let note = "";

  if (agentKey === "sprint") {
    code = "SPRINT PACK";
    name = "Combined Growth Pack";
    markdown = lastGrowthPack || "";
    fallbackUsed = false;
  } else {
    const cfg = AGENT_UI_CONFIG.find(c => c.key === agentKey);
    code = cfg ? cfg.code : "AGENT OUTPUT";
    name = cfg ? cfg.title : "Agent Output";
    state = agentState[agentKey];
    if (state) {
      markdown = state.markdown;
      fallbackUsed = state.fallbackUsed;
    }
  }

  eyebrow.textContent = code;
  title.textContent = name;

  // Set visual color scheme theme based on pipeline stage
  if (agentKey === "sprint") {
    drawer.style.setProperty("--node-accent", "#FFA726");
  } else if (agentKey === "profile") {
    drawer.style.setProperty("--node-accent", "#5C6BC0");
  } else {
    const cfg = AGENT_UI_CONFIG.find(c => c.key === agentKey);
    const stage = cfg ? cfg.stage : "research";
    drawer.style.setProperty("--node-accent", stage === "research" ? "#26A69A" : "#AB47BC");
  }

  let html = "";
  if (fallbackUsed && (agentKey === "market-intel" || agentKey === "geo-visibility" || agentKey === "citation-authority")) {
    html += `<div class="output-note">Live web search was unavailable, so this result used model knowledge only. Verify recency manually.</div>`;
  }
  html += renderMarkdown(markdown);
  body.innerHTML = html;

  // Enable/disable footer action buttons
  copyBtn.disabled = !markdown;
  dlBtn.disabled = !markdown;

  drawer.classList.add("open");
  
  // Fade out site-footer slightly so they don't overlap visually
  const footer = document.querySelector(".site-footer");
  if (footer) footer.style.opacity = "0.15";
}

function closeDrawer() {
  const drawer = document.getElementById("output-drawer");
  drawer.classList.remove("open");
  currentDrawerAgentKey = null;

  const footer = document.querySelector(".site-footer");
  if (footer) footer.style.opacity = "1";
}

async function handleDrawerCopy() {
  if (!currentDrawerAgentKey) return;
  let markdown = "";
  if (currentDrawerAgentKey === "sprint") {
    markdown = lastGrowthPack;
  } else {
    const state = agentState[currentDrawerAgentKey];
    if (state) markdown = state.markdown;
  }
  if (!markdown) return;

  const copyBtn = document.getElementById("drawer-copy-btn");
  try {
    await navigator.clipboard.writeText(markdown);
    flashButtonLabel(copyBtn, "Copied");
  } catch {
    flashButtonLabel(copyBtn, "Copy failed");
  }
}

function handleDrawerDownload() {
  if (!currentDrawerAgentKey) return;
  let markdown = "";
  if (currentDrawerAgentKey === "sprint") {
    markdown = lastGrowthPack;
  } else {
    const state = agentState[currentDrawerAgentKey];
    if (state) markdown = state.markdown;
  }
  if (!markdown) return;

  const dlBtn = document.getElementById("drawer-download-btn");
  downloadMarkdown(`${currentDrawerAgentKey}.md`, markdown);
  flashButtonLabel(dlBtn, "Downloaded");
}

// ---------------- Boot ----------------

document.addEventListener("DOMContentLoaded", () => {
  renderConsole();
  wireCardActions();
  initCanvas();

  window.addEventListener("resize", drawWires);
  // Delay initial drawing slightly to guarantee nodes have rendered positions
  setTimeout(drawWires, 100);

  document.getElementById("run-sprint-btn").addEventListener("click", runFullSprint);

  // Wire Drawer Events
  document.getElementById("drawer-close-btn").addEventListener("click", closeDrawer);
  document.getElementById("drawer-copy-btn").addEventListener("click", handleDrawerCopy);
  document.getElementById("drawer-download-btn").addEventListener("click", handleDrawerDownload);

  // Close drawer if clicking escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
});
