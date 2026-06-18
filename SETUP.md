# Setup Guide

Everything you need to go from clone to fully live.

## Prerequisites

- Node.js 18+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is fine)
- A GitHub account (you already have one: `5mil`)

---

## Step 1 — Clone & install

```bash
git clone https://github.com/5mil/bg-check-engine
cd bg-check-engine
bash scripts/setup.sh
```

The setup script installs dependencies, creates your `.env`, deploys the Cloudflare Worker, and prints your Worker URL.

---

## Step 2 — Create a GitHub OAuth App

1. Go to [github.com/settings/applications/new](https://github.com/settings/applications/new)
2. Fill in:
   - **Application name:** bg-check-engine
   - **Homepage URL:** `https://5mil.github.io/bg-check-engine/`
   - **Authorization callback URL:** `https://5mil.github.io/bg-check-engine/`
3. Click **Register application**
4. Copy the **Client ID**

---

## Step 3 — Host the Express API (free options)

The `src/` Express app needs a public HTTPS URL. Below are all viable free options as of 2026.

> ⚠️ **Glitch shut down app hosting July 8, 2025.** Heroku free tier is also gone.

### Container / Always-on platforms

| Platform | Free tier | Cold start | Card required | Best for |
|---|---|---|---|---|
| [Railway](https://railway.app) | $5 credit + $1/mo | None | No | Full-stack + DB in one place |
| [Render](https://render.com) | 750 hrs/mo, 512 MB | 30–50s after 15min idle | No | Longest free runway; use keep-alive ping |
| [Koyeb](https://koyeb.com) | 1 service, 512 MB, 0.1 vCPU | Varies | No | Simple, no sleep |
| [SnapDeploy](https://snapdeploy.dev) | 4 containers, 512 MB, 10 deploys/day | 10–30s (auto-wake) | No | Docker-native; WebSocket support |
| [Fly.io](https://fly.io) | Trial (2 VMs, 1 GB storage) | None | No (trial) | Production-grade |
| [Google Cloud Run](https://cloud.run) | 180K vCPU-sec + 2M req/mo | 5–15s | Yes | Scale-to-zero; very generous quota |
| [Oracle Cloud](https://www.oracle.com/cloud/free/) | 2 AMD VMs or 4 ARM VMs always-free | None | Yes | Most generous always-free compute |
| [Val.town](https://val.town) | Serverless functions, community | N/A | No | Lightweight endpoints |
| [Digital Ocean App Platform](https://www.digitalocean.com/products/app-platform) | 3 free static sites | N/A | Yes | Static only on free tier |

### Serverless (lightweight endpoints only)

| Platform | Free tier | Timeout | Notes |
|---|---|---|---|
| [Cloudflare Workers](https://workers.cloudflare.com) | 100K req/day | 10ms CPU | Already using this for OAuth |
| [Vercel Functions](https://vercel.com) | 100 GB-hrs | 10s | Easy if in Vercel ecosystem |
| [Netlify Functions](https://netlify.com) | 125K invocations/mo | 10s | AWS Lambda under the hood |
| [AWS Lambda](https://aws.amazon.com/lambda/pricing/) | 1M req + 400K GB-sec/mo | 15 min | Most generous but complex setup |

### ⭐ Recommendation for this project

Because the bg-check-engine makes multiple outbound HTTP calls per check (CourtListener, NSOPW, OpenSanctions, JudyRecords), **serverless with a 10-second timeout will cut off mid-check**. Use a **container platform**:

- **Railway** — best if you want built-in PostgreSQL for caching results, no cold starts
- **Render** — best if you want the longest free hours; add a free [cron-job.org](https://cron-job.org) ping every 10 min to prevent sleep
- **SnapDeploy** — best if your app is Dockerized
- **Oracle Cloud** — most generous compute ever (2 VMs free forever) if you're comfortable with Linux server setup

---

## Step 4 — Update docs/config.js

```js
window.BGCHECK_CONFIG = {
  githubClientId: "YOUR_CLIENT_ID_FROM_STEP_2",
  oauthWorkerUrl: "https://bg-check-oauth.YOUR.workers.dev",
  apiBaseUrl: "https://YOUR-BACKEND/api",
  allowedUsers: ["5mil"],
  allowedOrgs: [],
  redirectPath: "/bg-check-engine/",
  demoMode: false
};
```

Commit and push.

---

## Step 5 — Enable GitHub Pages

1. Go to **github.com/5mil/bg-check-engine/settings/pages**
2. Source: **Deploy from a branch** → `main` / `/docs`
3. Save

Live at: **https://5mil.github.io/bg-check-engine/**

---

## Step 6 — CI auto-deploy (optional)

Add these secrets under **Settings → Secrets → Actions**:

| Secret | Value |
|---|---|
| `CF_API_TOKEN` | Cloudflare API token (Workers:Edit) |
| `GH_OAUTH_CLIENT_ID` | GitHub OAuth App Client ID |
| `GH_OAUTH_CLIENT_SECRET` | GitHub OAuth App Client Secret |

After this, pushing to `worker/oauth/` auto-deploys the Worker via GitHub Actions.

---

## What requires manual input

| Item | Why |
|---|---|
| GitHub OAuth Client ID/Secret | Created interactively on GitHub |
| Cloudflare API token | Generated in your Cloudflare dashboard |
| Backend API URL | Depends on your chosen host |
| Stripe / Onfido keys | Require account signup |
