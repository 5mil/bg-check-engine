window.BGCHECK_CONFIG = {
  // --- FILL THESE IN AFTER SETUP ---
  githubClientId: "",          // GitHub OAuth App Client ID
  oauthWorkerUrl: "",          // https://bg-check-oauth.YOUR.workers.dev
  apiBaseUrl: "",              // https://YOUR-BACKEND/api

  // --- READY TO GO ---
  allowedUsers: ["5mil"],      // GitHub usernames allowed access
  allowedOrgs: [],             // GitHub org logins (optional)
  redirectPath: "/bg-check-engine/",
  demoMode: true               // Shows mock results when apiBaseUrl is empty
};
