#!/usr/bin/env bash
# bg-check-engine setup script
# Run from repo root: bash scripts/setup.sh

set -e

echo ""
echo "=== bg-check-engine setup ==="
echo ""

# 1. Install root dependencies
echo "[1/4] Installing API server dependencies..."
npm install

# 2. Copy .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[2/4] Created .env from .env.example — fill in your keys."
else
  echo "[2/4] .env already exists, skipping."
fi

# 3. Install worker dependencies
echo "[3/4] Installing Cloudflare Worker dependencies..."
cd worker/oauth && npm install && cd ../..

# 4. Prompt for Worker secrets
echo ""
echo "[4/4] Deploying Cloudflare Worker..."
echo "You will be prompted for 3 secrets. Paste each value when asked."
echo ""
cd worker/oauth
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put ALLOWED_ORIGIN
npx wrangler deploy
cd ../..

echo ""
echo "Done! Copy the workers.dev URL above into docs/config.js → oauthWorkerUrl"
echo "Then set githubClientId in docs/config.js and enable GitHub Pages from /docs."
echo ""
