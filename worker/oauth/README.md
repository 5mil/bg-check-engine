# bg-check-oauth Worker

Cloudflare Worker that securely exchanges a GitHub OAuth `code` for an `access_token`.
The GitHub client secret lives **only** in Cloudflare's encrypted environment — never in the repo or the frontend.

## Deploy in 3 steps

```bash
cd worker/oauth
npm install

# Set secrets (prompts you to paste each value)
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put ALLOWED_ORIGIN   # e.g. https://5mil.github.io

# Deploy
npx wrangler deploy
```

Your Worker URL will be:
```
https://bg-check-oauth.<your-subdomain>.workers.dev
```

Paste that URL into `docs/config.js` as `oauthWorkerUrl`.

## Endpoint

```
POST /exchange
Content-Type: application/json

{ "code": "<github_oauth_code>" }
```

Returns:
```json
{ "access_token": "gho_..." }
```

## GitHub OAuth App settings

- Homepage URL: `https://5mil.github.io/bg-check-engine/`
- Authorization callback URL: `https://5mil.github.io/bg-check-engine/`
