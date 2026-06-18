/**
 * Cloudflare Worker: GitHub OAuth Code Exchange
 * Deployed at: https://bg-check-oauth.YOUR-SUBDOMAIN.workers.dev
 *
 * Environment variables (set in Cloudflare dashboard or wrangler secret):
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   ALLOWED_ORIGIN  (your GitHub Pages URL)
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://5mil.github.io';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // POST /exchange — swap GitHub OAuth code for access token
    if (request.method === 'POST' && url.pathname === '/exchange') {
      try {
        const { code } = await request.json();
        if (!code) {
          return json({ error: 'Missing code' }, 400, corsHeaders);
        }

        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });

        const data = await tokenRes.json();

        if (data.error) {
          return json({ error: data.error_description || data.error }, 400, corsHeaders);
        }

        return json({ access_token: data.access_token }, 200, corsHeaders);
      } catch (err) {
        return json({ error: err.message }, 500, corsHeaders);
      }
    }

    return json({ error: 'Not found' }, 404, corsHeaders);
  },
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
