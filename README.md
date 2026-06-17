# Safe AI Growth Engine — VoiceCare AI

A safe AI operating console for LinkedIn follower growth, GEO/AEO/ASO visibility, competitor share of voice, citation authority, and conversion assets.

This repository implements a working prototype of a **6-agent sequential growth sprint engine**. The engine helps B2B companies (pre-configured for VoiceCare AI) scale LinkedIn presence and AI search engine (ChatGPT, Perplexity, Gemini, Google AI Overviews) discoverability safely—**without LinkedIn automation, scraping, or buying leads**, and with **zero exposure to Protected Health Information (PHI)**.

---

## 1. Upgraded 6-Agent Architecture

The system operates as a sequential multi-agent pipeline where agents pass relevant context (such as competitor gaps and category narratives) down the chain to coordinate a comprehensive weekly "growth pack."

```
                          [ Company Profile Input ]
                                     |
                                     v
                 +---------------------------------------+
                 | Agent 1: Market Intelligence & SOV    |
                 +---------------------------------------+
                                     |
                       (Top 5 Gaps & Category Narrative)
                                     |
                 +-------------------+-------------------+
                 |                                       |
                 v                                       v
+----------------------------------+   +----------------------------------+
| Agent 2: LinkedIn & Founder POV  |   | Agent 3: GEO/AEO/ASO Blog Audit  |
+----------------------------------+   +----------------------------------+
                 |                                       |
                 +-------------------+-------------------+
                                     |
                                     v
                 +---------------------------------------+
                 | Agent 4: Growth Measurement & Forecast|
                 +---------------------------------------+
                                     |
                 +-------------------+-------------------+
                 |                                       |
                 v                                       v
+----------------------------------+   +----------------------------------+
| Agent 5: Third-Party Citation    |   | Agent 6: Conversion & Repurposing|
+----------------------------------+   +----------------------------------+
                 |                                       |
                 +-------------------+-------------------+
                                     |
                                     v
                     [ Combined Growth Pack (.md) ]
```

### Agent Directory

| Agent | Primary Model | Fallback Model | Purpose & Output |
| :--- | :--- | :--- | :--- |
| **01. Market Intelligence + SOV** | `groq/compound` | `llama-3.3-70b-versatile` | Analyzes competitors, generates share-of-voice scorecard, identifies 5 core content gaps, and defines weekly category narrative. |
| **02. LinkedIn Content + Founder Growth** | `llama-3.3-70b-versatile` | `llama-3.1-8b-instant` | Drafts LinkedIn posts for company and founder, creates employee advocacy snippets, carousel outlines, and manual comment starters. |
| **03. AI Search / GEO-AEO-ASO Audit** | `groq/compound` | `llama-3.3-70b-versatile` | Audits existing blog URLs, drafts high-intent SEO/GEO content briefs with direct answer blocks, schema, and citation-testing protocols. |
| **04. Growth Measurement & Forecast** | `llama-3.3-70b-versatile` | `llama-3.1-8b-instant` | Performs pace-to-goal calculations, maps channel-level follower contribution targets, and proposes 3 weekly experiments. |
| **05. Third-Party Citation & Authority** | `groq/compound` | `llama-3.3-70b-versatile` | Discovers directory listings, guest opportunities, and pitches to raise AI-engine citation probability. |
| **06. Conversion Asset & Repurposing** | `llama-3.3-70b-versatile` | `llama-3.1-8b-instant` | Maps visibility to CTA pathways, lead magnets, webinar funnels, and repurposes blog content into multi-channel formats. |

---

## 2. Safety & Compliance Boundaries

The growth engine enforces strict guardrails to prevent platform bans and maintain regulatory compliance:

1. **No Automation or Integration**: The system does not interface with any social media API or browser automation tool. It has **no write-access** to LinkedIn. It only outputs text drafts for manual review, copy, and posting.
2. **No Scraping**: No automated web scraping of LinkedIn profiles, Sales Navigator, or logged-in pages is performed. The engine operates only on public data and manually supplied analytics.
3. **Strict PHI Containment**: The system never accepts, processes, or references patient data, clinical records, or Protected Health Information (PHI). It is strictly limited to corporate marketing and B2B positioning data.
4. **No Unverified Claims**: The prompts forbid generating invented facts, customer names, funding figures, or unsupported ROI/compliance claims. If data is missing, the output inserts verified placeholders or states it plainly.
5. **No Engagement Pods or Spam**: The LinkedIn content agent warns against identical copy-pasting and does not support coordinated fake comments, pods, or bots.
6. **Human-in-the-Loop (HITL)**: Every post draft ends with `DRAFT — human review required before posting.`, ensuring compliance, brand safety, and editorial quality are verified by a human operator.

---

## 3. Local Execution Setup

This project is built using native web technologies with zero frontend dependencies (no `npm install` needed).

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or later)
- Vercel CLI (for running the serverless backend locally)

### Step-by-Step Run Instructions
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd ai-growth-engine-agent
   ```
2. **Configure Local Environment**:
   Copy the example environment file and add your Groq API key:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your key (obtain a free key from the [Groq Console](https://console.groq.com/keys)):
   ```env
   GROQ_API_KEY=gsk_your_groq_key_here
   ```
3. **Run Dev Server**:
   Start the local development server using the Vercel CLI:
   ```bash
   npx vercel dev
   ```
4. **Access the Console**:
   Open the browser and navigate to the local URL printed in your terminal (usually `http://localhost:3000`).

---

## 4. Vercel Setup & Environment Variables

### Production Environment Variable Configuration
To deploy the application to Vercel, the backend function must have access to the Groq API key without exposing it to the client:

1. Add the variable to Vercel via CLI:
   ```bash
   npx vercel env add GROQ_API_KEY
   ```
   *When prompted, paste your Groq API key and select all environments (Production, Preview, Development).*
2. Do **NOT** prefix this variable with framework prefixes (like `NEXT_PUBLIC_` or `VITE_`), as doing so would bundle the secret into client-side code and leak it to users.

### Function Duration Limits (`vercel.json`)
The sequential execution of the multi-agent sprint can take longer than the default Vercel serverless function execution limit. It is highly recommended to override this in the project's root `vercel.json` file:

```json
{
  "functions": {
    "api/agent.js": {
      "maxDuration": 60
    }
  }
}
```

*Note: On Vercel Hobby accounts, the maximum duration is capped at 10 seconds. For Hobby plans, we recommend running agents individually rather than running the full sequential sprint, or configuring smaller `maxCompletionTokens` in `api/prompts.js` to stay within limits.*

---

## 5. Documentation Directory

For deep dives into architectural rules, design details, and templates, consult the following:

| Document | Description |
| :--- | :--- |
| **[docs/PRD.md](docs/PRD.md)** | Product specifications, goals, detailed non-goals, functional requirements, and success metrics. |
| **[docs/DESIGN.md](docs/DESIGN.md)** | CSS design tokens, typography, minimalist layout grid, dark theme styling, and the status-dot visual signature. |
| **[docs/AGENT_FLOWS.md](docs/AGENT_FLOWS.md)** | Complete agent orchestrations, prompts, parameters, contracts, and fallback strategy. |
| **[docs/VERCEL_ENV_SETUP.md](docs/VERCEL_ENV_SETUP.md)** | Step-by-step setup guides for environment variables and Vercel CLI deployment pipelines. |
| **[docs/VOICECARE_GROWTH_ENGINE_ZIP_UPDATE.md](docs/VOICECARE_GROWTH_ENGINE_ZIP_UPDATE.md)** | Checklist for upgrading code files (prompts, client app, style adjustments) to support the 6-agent system. |
