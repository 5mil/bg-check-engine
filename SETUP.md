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

## Step 3 — Update docs/config.js

Open `docs/config.js` and fill in:

```js
window.BGCHECK_CONFIG = {
  githubClientId: "YOUR_CLIENT_ID_FROM_STEP_2",
  oauthWorkerUrl: "https://bg-check-oauth.YOUR-SUBDOMAIN.workers.dev", // from setup.sh output
  apiBaseUrl: "https://YOUR-API-HOST/api",  // your Railway/Render/Glitch backend
  allowedUsers: ["5mil"],
  allowedOrgs: [],
  redirectPath: "/bg-check-engine/"
};
```

Commit and push.

---

## Step 4 — Enable GitHub Pages

1. Go to **github.com/5mil/bg-check-engine/settings/pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / Folder: `/docs`
4. Save

Your live URL: **https://5mil.github.io/bg-check-engine/**

---

## Step 5 — CI auto-deploy (optional)

Add these secrets to your GitHub repo (**Settings → Secrets → Actions**):

| Secret name | Value |
|---|---|
| `CF_API_TOKEN` | Cloudflare API token (Workers:Edit) |
| `GH_OAUTH_CLIENT_ID` | GitHub OAuth App Client ID |
| `GH_OAUTH_CLIENT_SECRET` | GitHub OAuth App Client Secret |

After this, any push to `worker/oauth/` will auto-deploy the Worker via GitHub Actions.

---

## What requires manual input (can't be automated)

| Item | Why |
|---|---|
| GitHub OAuth Client ID/Secret | Created interactively on GitHub |
| Cloudflare API token | Must be generated in your Cloudflare dashboard |
| Backend API URL | Depends on where you deploy the Express server |
| Stripe / Onfido keys | Require account creation and key generation |
