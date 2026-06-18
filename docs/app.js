const config = window.BGCHECK_CONFIG;

// DOM refs
const loginBtn    = document.getElementById('loginBtn');
const logoutBtn   = document.getElementById('logoutBtn');
const userCard    = document.getElementById('userCard');
const toolCard    = document.getElementById('toolCard');
const avatar      = document.getElementById('avatar');
const userName    = document.getElementById('userName');
const userLogin   = document.getElementById('userLogin');
const results     = document.getElementById('results');
const checkForm   = document.getElementById('checkForm');
const submitBtn   = document.getElementById('submitBtn');
const spinner     = document.getElementById('spinner');
const setupBanner = document.getElementById('setupBanner');

// Hide setup banner if fully configured
if (config.githubClientId && config.oauthWorkerUrl && config.apiBaseUrl) {
  setupBanner.classList.add('hidden');
}

const saveToken  = t  => localStorage.setItem('github_token', t);
const getToken   = () => localStorage.getItem('github_token');
const clearToken = () => localStorage.removeItem('github_token');

function buildGithubAuthUrl() {
  const p = new URLSearchParams({
    client_id:    config.githubClientId,
    redirect_uri: `${location.origin}${config.redirectPath}`,
    scope:        'read:user read:org',
  });
  return `https://github.com/login/oauth/authorize?${p}`;
}

async function githubFetch(path) {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${getToken()}`, Accept: 'application/vnd.github+json' },
  });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  return r.json();
}

async function exchangeCode(code) {
  // Full path: /api/oauth/exchange — oauthWorkerUrl is the base (e.g. https://...railway.app/api)
  const r = await fetch(`${config.oauthWorkerUrl}/oauth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.access_token;
}

async function enforceAccess(user) {
  if (!config.allowedUsers.length) return true;
  if (config.allowedUsers.includes(user.login)) return true;
  if (config.allowedOrgs.length) {
    try {
      const orgs = await githubFetch('/user/orgs');
      return config.allowedOrgs.some(o => orgs.map(x => x.login).includes(o));
    } catch { return false; }
  }
  return false;
}

async function loadUser() {
  if (!getToken()) return;
  const user = await githubFetch('/user');
  if (!await enforceAccess(user)) {
    clearToken();
    alert('Your GitHub account is not on the allowlist.');
    return;
  }
  avatar.src            = user.avatar_url;
  userName.textContent  = user.name || user.login;
  userLogin.textContent = `@${user.login}`;
  userCard.classList.remove('hidden');
  toolCard.classList.remove('hidden');
  loginBtn.classList.add('hidden');
}

async function maybeHandleOAuthRedirect() {
  const code = new URLSearchParams(location.search).get('code');
  if (!code) return;
  history.replaceState({}, '', location.pathname);
  if (!config.oauthWorkerUrl) {
    alert('oauthWorkerUrl not set in config.js.');
    return;
  }
  try {
    saveToken(await exchangeCode(code));
    await loadUser();
  } catch (e) { alert(`Login failed: ${e.message}`); }
}

function mockResults(payload) {
  return {
    _demo: true,
    _note: 'Demo mode — set apiBaseUrl in config.js to use real data',
    courtListener: {
      source: 'CourtListener', count: 1,
      records: [{ caseName: `${payload.firstName} ${payload.lastName} v. Example Corp`, court: 'S.D.N.Y.', dateFiled: '2019-03-12', status: 'Closed' }]
    },
    nsopw:         { source: 'NSOPW', count: 0, records: [] },
    openSanctions: { source: 'OpenSanctions', count: 0, records: [] },
    judyRecords:   { source: 'JudyRecords', count: 0, records: [] },
    meta: { query: payload, timestamp: new Date().toISOString() }
  };
}

loginBtn.addEventListener('click', () => {
  if (!config.githubClientId) {
    alert('Set githubClientId in docs/config.js to enable login.');
    return;
  }
  location.href = buildGithubAuthUrl();
});

logoutBtn.addEventListener('click', () => { clearToken(); location.reload(); });

checkForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName:  document.getElementById('lastName').value.trim(),
    state:     document.getElementById('state').value.trim() || undefined,
    dob:       document.getElementById('dob').value || undefined,
  };

  submitBtn.disabled = true;
  spinner.classList.remove('hidden');
  results.classList.add('hidden');

  try {
    let data;
    if (!config.apiBaseUrl || config.demoMode) {
      await new Promise(r => setTimeout(r, 900));
      data = mockResults(payload);
    } else {
      const r = await fetch(`${config.apiBaseUrl}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Request failed');
    }
    results.textContent = JSON.stringify(data, null, 2);
    results.classList.remove('hidden');
  } catch (err) {
    results.textContent = `Error: ${err.message}`;
    results.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

maybeHandleOAuthRedirect().then(() => loadUser()).catch(() => clearToken());
