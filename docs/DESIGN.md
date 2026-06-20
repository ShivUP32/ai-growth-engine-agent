# DESIGN.md — Updated Minimalist Design Instructions

This file updates the app design for the expanded six-agent Safe AI Growth Engine while preserving the existing operations-console visual system: calm workspace, sparse accent usage, flat cards, readable markdown outputs, and strong safety/status cues.

The visual design should remain minimalist and operations-console inspired, but the UI now needs to support six agents and more complex outputs without becoming dense.

---

## 1. Design Scope Update

The current 2x2 grid must become a scalable agent console that supports six cards:

```text
Desktop:
[Agent 01] [Agent 02]
[Agent 03] [Agent 04]
[Agent 05] [Agent 06]

Tablet/Mobile:
[Agent 01]
[Agent 02]
[Agent 03]
[Agent 04]
[Agent 05]
[Agent 06]
```

Do **not** add a heavy dashboard look. Keep the existing warm paper background, flat cards, hairline borders, and restrained accent system.

---

## 2. Updated Agent Card Titles

| Code | UI Title | Short description |
|---|---|---|
| AGENT 01 | Market + Share of Voice | Competitors, category gaps, ranking visibility, and weekly narrative. |
| AGENT 02 | LinkedIn + Founder Growth | Company posts, founder posts, employee snippets, partner kit, and repurposing. |
| AGENT 03 | GEO/AEO/ASO Audit | Existing blog audit, new content brief, AI-engine testing, schema and CTA recommendations. |
| AGENT 04 | Growth Forecast | Pace math, reverse follower model, visibility scorecard, and experiments. |
| AGENT 05 | Citation Authority | Directories, third-party mentions, PR/partner opportunities, and trust assets. |
| AGENT 06 | Conversion + Repurposing | CTA mapping, lead magnets, webinar/report assets, and content reuse plan. |

---

## 3. New Input Patterns

Add support for:

- Multi-line URL textarea for blog/page audit.
- Multi-line manual analytics notes.
- Multi-line manual AI-engine test notes.
- Select dropdown for asset type:
  - Blog
  - Webinar
  - Report
  - Case study
  - Comparison page
  - Checklist
  - ROI calculator
- Optional textarea for source asset summary.

Keep the existing input style:

- `--bg` input background.
- `--surface` on focus.
- 1px `--border`.
- 6px radius.
- No shadows.

---

## 4. Updated Layout Spec

```text
┌─────────────────────────────────────────────┐
│ Header: brand mark + name, one-line tagline │
├─────────────────────────────────────────────┤
│ Company Profile panel                       │
│ - company fields                            │
│ - follower target fields                    │
│ - full sprint action row                    │
├─────────────────────────────────────────────┤
│ Agent console: 2-column scalable grid        │
│ [Agent 01] [Agent 02]                       │
│ [Agent 03] [Agent 04]                       │
│ [Agent 05] [Agent 06]                       │
├─────────────────────────────────────────────┤
│ Growth pack actions                         │
│ - Copy combined pack                        │
│ - Download combined .md                     │
├─────────────────────────────────────────────┤
│ Footer: human review note + doc links          │
└─────────────────────────────────────────────┘
```

---

## 5. New Status and Metadata Requirements

Keep the same status-dot states:

| State | Visual | Meaning |
|---|---|---|
| idle | hollow circle | Not yet run this session |
| running | rust pulse | Waiting on Groq response |
| done | solid teal | Last run succeeded |
| error | solid red | Last run failed |

Add one metadata line below each card output:

```text
MODEL: groq/compound · FALLBACK: no · GENERATED: YYYY-MM-DD HH:MM
```

If fallback is used for a web-search agent, show the existing inline note banner before the output:

```text
Live web search was unavailable, so this result used model knowledge only. Verify recency manually.
```

---

## 6. Output Readability Updates

The updated agents generate longer tables. Add these CSS requirements:

```css
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

Keep Markdown section headings visually quieter than card titles.

---
