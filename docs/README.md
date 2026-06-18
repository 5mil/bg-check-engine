# GitHub Pages setup

This repo now includes a static frontend in `docs/` so GitHub Pages can serve a UI for the background check engine.

## What it does

- Presents a GitHub login button.
- Uses GitHub OAuth authorize flow in the browser.
- Calls the GitHub API to fetch the signed-in user profile.
- Enforces a simple allowlist based on usernames and/or org membership.
- Calls the backend `/api/check` endpoint after login.

## Important security note

GitHub Pages is static hosting only. A secure GitHub OAuth implementation requires a backend or serverless function to exchange the OAuth `code` for an access token because the GitHub client secret must never be exposed in frontend code.

That means the included frontend is a **starter UI**, but to make login actually work you need one of these:

- Cloudflare Worker
- Netlify Function
- Vercel Function
- Railway/Render/Glitch backend endpoint
- Your existing Express API with an `/oauth/github/exchange` endpoint

## Required config

Edit `docs/config.js`:

- `githubClientId`: your GitHub OAuth App client ID
- `apiBaseUrl`: public base URL for your backend API
- `allowedUsers`: GitHub usernames allowed to use the tool
- `allowedOrgs`: optional allowed GitHub org logins
- `redirectPath`: GitHub Pages repo path, `/bg-check-engine/`

## Enable Pages

In GitHub repo settings:

1. Go to **Settings** > **Pages**.
2. Set source to **Deploy from a branch**.
3. Choose branch `main` and folder `/docs`.
4. Save.

Your site URL should become:

`https://5mil.github.io/bg-check-engine/`

## OAuth app setup

Create a GitHub OAuth App and set:

- Homepage URL: `https://5mil.github.io/bg-check-engine/`
- Authorization callback URL: `https://5mil.github.io/bg-check-engine/`

## Recommended next step

Add a backend endpoint like:

`POST /oauth/github/exchange`

Request body:

```json
{ "code": "github_oauth_code_here" }
```

The backend should call GitHub's token endpoint using your client secret and return a short-lived session token or the GitHub access token.
