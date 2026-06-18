window.BGCHECK_CONFIG = {
  githubClientId: "Ov23liZLjGS5A067KS2m",

  // Railway handles OAuth exchange now — no Cloudflare Worker needed
  oauthWorkerUrl: "https://bg-check-engine-production.up.railway.app/api",

  apiBaseUrl: "https://bg-check-engine-production.up.railway.app/api",

  allowedUsers: ["5mil"],
  allowedOrgs: [],
  redirectPath: "/bg-check-engine/",
  demoMode: false
};
