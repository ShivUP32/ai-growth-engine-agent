# VERCEL_ENV_SETUP.md — Updated Vercel Environment Variable Setup

This file keeps the original server-side Groq key setup and adds deployment notes for the expanded six-agent sprint. The security model remains unchanged: the browser never receives the Groq API key.

The environment setup remains mostly correct. Only the expanded agent scope and timeout/token guidance need to be added.

---

## 1. Required Environment Variable

Keep:

```text
GROQ_API_KEY=your_groq_key_here
```

Do not rename it to any public/client-prefixed value such as:

```text
NEXT_PUBLIC_GROQ_API_KEY
VITE_GROQ_API_KEY
REACT_APP_GROQ_API_KEY
```

Those names are unsafe in frontend frameworks because they can leak secrets into browser code.

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
