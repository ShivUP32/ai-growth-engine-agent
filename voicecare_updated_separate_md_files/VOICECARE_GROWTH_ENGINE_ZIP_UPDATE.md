# VOICECARE_GROWTH_ENGINE_ZIP_UPDATE.md — Required Repository Updates

This file lists the repository-level changes needed to bring `voicecare-growth-engine.zip` in line with the updated Safe AI Growth Engine playbook. It should sit beside the updated docs or inside the repo `docs/` folder as an implementation checklist.

The uploaded zip contains the current 4-agent prototype. To align it with the updated playbook, make the following changes before re-zipping.

## 1 `api/prompts.js` Changes

### Update `SAFETY_CORE`

Add these rules to the shared safety core:

```text
6. You do not make clinical, medical, compliance, security, or ROI claims beyond what is explicitly supplied or publicly verifiable.
7. When working on GEO/AEO/ASO, treat ASO as AI Search Optimization / Answer Search Optimization, not App Store Optimization.
8. You always output clean Markdown only — no preambles, no meta commentary, and no unsupported claims.
```

### Upgrade `market-intel`

Add share-of-voice scorecard output:

```text
## Competitor Ranking and Share-of-Voice Scorecard
Competitor | LinkedIn Followers | AI-Engine Mentions | Google Category Presence | Third-Party Mentions | Key Strength | VoiceCare Gap | Action
```

Increase `maxCompletionTokens` to `2200`.

### Upgrade `linkedin-content`

Add output sections:

```text
## Employee Advocacy Snippets
## Partner / Investor Amplification Kit
## Repurposing Plan
```

Increase `maxCompletionTokens` to `2400`.

### Upgrade `geo-visibility`

Rename label to:

```text
AI Search / GEO-AEO-ASO Visibility Agent
```

Add required output section before content brief:

```text
## Existing Blog / Page Audit
```

Add input fields to prompt:

```text
Existing blog/page URLs to audit: ${inputs.blogUrls || "(none supplied)"}
Google Search Console notes: ${inputs.searchConsoleNotes || "(none supplied)"}
GA4 notes: ${inputs.ga4Notes || "(none supplied)"}
Manual AI-engine test notes: ${inputs.manualAiEngineResults || "(none supplied)"}
```

Increase `maxCompletionTokens` to `2600`.

### Upgrade `growth-report`

Add output sections:

```text
## Reverse Follower Growth Model
## Visibility Scorecard
```

Increase `maxCompletionTokens` to `1900`.

### Add `citation-authority`

New agent config:

```js
"citation-authority": {
  label: "Third-Party Citation + Authority Agent",
  model: "groq/compound",
  fallbackModel: "llama-3.3-70b-versatile",
  temperature: 0.4,
  maxCompletionTokens: 2200,
  systemPrompt: `...`,
  buildUserPrompt: (company, inputs) => `...`
}
```

Required sections:

```text
## Citation Opportunity List
## Priority Targets
## Pitch Angles
## Trust Asset Requirements
## Safe Next Actions
```

### Add `conversion-repurposing`

New agent config:

```js
"conversion-repurposing": {
  label: "Conversion Asset + Repurposing Agent",
  model: "llama-3.3-70b-versatile",
  fallbackModel: "llama-3.1-8b-instant",
  temperature: 0.6,
  maxCompletionTokens: 2400,
  systemPrompt: `...`,
  buildUserPrompt: (company, inputs) => `...`
}
```

Required sections:

```text
## Conversion Asset Map
## CTA Mapping
## Repurposing Matrix
## Original Data / Benchmark Asset Ideas
## Safe Next Actions
```

### Update agent order

```js
export const AGENT_ORDER = [
  "market-intel",
  "linkedin-content",
  "geo-visibility",
  "growth-report",
  "citation-authority",
  "conversion-repurposing",
];
```

---

## 2 `app.js` Changes

Update `AGENT_UI_CONFIG` from four cards to six cards.

Add these cards:

```js
{
  key: "citation-authority",
  code: "AGENT 05",
  title: "Citation Authority",
  description: "Finds third-party directories, roundups, partner pages, podcasts, webinars, and trust assets that can improve AI-engine citation potential.",
  fields: [
    { id: "targetSources", label: "Known sources or categories to prioritize", type: "textarea" },
    { id: "approvedProof", label: "Approved proof points / trust claims", type: "textarea" }
  ]
}
```

```js
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
```

Update Agent 03 fields:

```js
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
  id: "manualAiEngineResults",
  label: "Manual AI-engine test notes (optional)",
  type: "textarea"
}
```

Update full sprint assembly to include six sections in the combined growth pack.

---

## 3 `index.html` Changes

Update tagline copy from a four-agent prototype to a broader safe growth operating system.

Recommended copy:

```html
<p class="brand-tagline">
  A safe AI operating console for LinkedIn growth, GEO/AEO/ASO visibility, competitor share of voice, citation authority, and conversion assets.
</p>
```

Update footer compliance copy:

```html
No LinkedIn automation. No scraping. No auto-DMs. No fake engagement. No PHI. Human review required before publishing or outreach.
```

---

## 4 `styles.css` Changes

Keep the current visual system. Add only overflow support and six-card grid support.

```css
.console {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}

.agent-output table {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.agent-output th,
.agent-output td {
  min-width: 140px;
  vertical-align: top;
}

.agent-output pre {
  overflow-x: auto;
  white-space: pre-wrap;
}
```

No new colors are required.

---

## 5 `README.md` Changes

Add a new section:

```text
## Updated Agent Scope

This version includes six safe agents:
1. Market + Share of Voice
2. LinkedIn + Founder Growth
3. GEO/AEO/ASO Blog Audit
4. Growth Forecast
5. Citation Authority
6. Conversion + Repurposing

The app does not automate LinkedIn or any social platform. It only researches, drafts, scores, and reports. Humans execute all public-facing actions manually.
```

---

## 6 `vercel.json` Change

Recommended:

```json
{
  "functions": {
    "api/agent.js": {
      "maxDuration": 60
    }
  }
}
```

If 60 seconds is not available on the deployment plan, keep 30 seconds and lower model output token caps.

---
