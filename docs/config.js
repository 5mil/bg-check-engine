window.BGCHECK_CONFIG = {
  githubClientId: "YOUR_GITHUB_OAUTH_APP_CLIENT_ID",
  // URL of your deployed Cloudflare Worker (worker/oauth)
  oauthWorkerUrl: "https://bg-check-oauth.YOUR-SUBDOMAIN.workers.dev",
  apiBaseUrl: "https://YOUR-API-HOST.example.com/api",
  allowedUsers: ["5mil"],
  allowedOrgs: [],
  redirectPath: "/bg-check-engine/"
};
