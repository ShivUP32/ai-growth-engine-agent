# VERCEL_ENV_SETUP.md — Updated Vercel Environment Variable Setup

This file keeps the original server-side Groq key setup and adds deployment notes for the expanded six-agent sprint. The security model remains unchanged: the browser never receives the Groq API key.

The environment setup remains mostly correct. Only the expanded agent scope and timeout/token guidance need to be added.

---

## 1. Required Environment Variables

Configure the following environment variables in Vercel under Project Settings → Environment Variables:

```text
GROQ_API_KEY=gsk_your_groq_key_here
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key_here
JINA_API_KEY=jina_your_primary_key_here
JINA_API_KEY_FALLBACK=jina_your_fallback_key_here
```

Do not rename any of these keys with public/client-prefixed prefixes such as:

```text
NEXT_PUBLIC_GROQ_API_KEY
VITE_GROQ_API_KEY
REACT_APP_GROQ_API_KEY
```

Frontend frameworks compile client-prefixed environment variables directly into client-side bundles, which will leak your private API keys to the browser. Keep them server-side only.

---

## 2. Updated Local Development Notes

Because the updated app can run six agents in one sprint, local testing should verify:

```bash
npx vercel dev
```

Then test these paths:

1. Run Agent 01 alone.
2. Run Agent 03 with at least two blog URLs.
3. Run Agent 04 with sample follower metrics.
4. Run the full six-agent sprint.
5. Download the combined growth-pack `.md`.
6. Confirm no Groq key appears in browser dev tools, source code, console logs, or network response payloads.

---

## 3. Updated `vercel.json` Guidance

The current 30-second serverless function cap may be tight for longer six-agent outputs. Keep each individual `/api/agent` request capped, but increase the function max duration to the highest value allowed by the chosen Vercel plan if needed.

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

If the plan does not allow 60 seconds, keep 30 seconds and reduce per-agent `maxCompletionTokens`.

---

## 3.1 Vercel Hobby Plan 10s Execution Timeout & Time Budgeting

Vercel Hobby accounts enforce a strict **10-second execution time limit** per serverless request. To prevent 504 function timeouts, the `/api/agent.js` endpoint implements dynamic time budgeting:

1.  **Safety Budgeting**: The code tracks elapsed time from request receipt, enforcing a strict 9.5s total time ceiling (`getRemainingTimeout` function).
2.  **Scraper Concurrency Limits**: Scrapes and competitor queries are capped under `process.env.VERCEL` to reduce network duration:
    *   **Market Intel (`market-intel`)**: Competitors queried are capped at 1 (max 2 queries total: company + 1 competitor).
    *   **GEO visibility / CTAs**: URLs scraped are capped at 1.
3.  **Low-Time Skip Rules**:
    *   If remaining budget time drops below `3.5s` during Jina scraping/searching, fallback retry attempts for Jina are automatically skipped.
    *   If remaining budget time drops below `2.5s`, the OpenRouter fallback model retry is skipped.
    *   If remaining budget time drops below `2.2s`, the OpenRouter fallback chain retries (capped at 2 attempts) are skipped.
4.  **Local Dev Bypass**: When `process.env.VERCEL` is not set (i.e. running on localhost), this timeout safety check is bypassed, allowing up to 15s for crawler/search requests and 60s for LLM operations, allowing for deep and comprehensive queries.

---

## 4. Updated Pre-Deploy Checklist

Before deployment:

- [ ] `.env.local` is not committed.
- [ ] `GROQ_API_KEY` exists in Vercel for Production, Preview, and Development.
- [ ] No `gsk_` key string exists in `index.html`, `styles.css`, `app.js`, `api/prompts.js`, docs, README, or git history.
- [ ] Browser network responses do not include the key.
- [ ] Six-agent sprint finishes without platform timeout.
- [ ] Fallback note appears when a compound/web-search agent falls back to a non-search model.
- [ ] Downloaded `.md` growth pack includes all six agents.
- [ ] Generated outputs include human-review disclaimers.
- [ ] No agent output recommends LinkedIn automation, scraping, fake accounts, engagement pods, or PHI use.

---
