const config = window.BGCHECK_CONFIG;
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userCard = document.getElementById('userCard');
const toolCard = document.getElementById('toolCard');
const avatar = document.getElementById('avatar');
const userName = document.getElementById('userName');
const userLogin = document.getElementById('userLogin');
const results = document.getElementById('results');
const checkForm = document.getElementById('checkForm');

function getRedirectUri() {
  return `${window.location.origin}${config.redirectPath}`;
}

function buildGithubAuthUrl() {
  const params = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: getRedirectUri(),
    scope: 'read:user read:org',
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

function saveToken(token) {
  localStorage.setItem('github_token', token);
}

function getToken() {
  return localStorage.getItem('github_token');
}

function clearToken() {
  localStorage.removeItem('github_token');
}

async function githubFetch(path) {
  const token = getToken();
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function getUserOrgs() {
  try {
    return await githubFetch('/user/orgs');
  } catch {
    return [];
  }
}

async function enforceAccess(user) {
  const userAllowed = !config.allowedUsers.length || config.allowedUsers.includes(user.login);
  if (userAllowed) return true;

  if (config.allowedOrgs.length) {
    const orgs = await getUserOrgs();
    const orgLogins = orgs.map(org => org.login);
    return config.allowedOrgs.some(org => orgLogins.includes(org));
  }

  return false;
}

async function loadUser() {
  const token = getToken();
  if (!token) return;

  const user = await githubFetch('/user');
  const allowed = await enforceAccess(user);
  if (!allowed) {
    clearToken();
    alert('You are signed in, but not authorized to use this tool.');
    return;
  }

  avatar.src = user.avatar_url;
  userName.textContent = user.name || 'Signed in';
  userLogin.textContent = `@${user.login}`;
  userCard.classList.remove('hidden');
  toolCard.classList.remove('hidden');
  loginBtn.classList.add('hidden');
}

async function exchangeCodeForToken(code) {
  alert('GitHub Pages cannot safely exchange OAuth codes by itself. Configure a backend or serverless function to exchange the code for a token, then store it here.');
  console.log('OAuth code received:', code);
}

function maybeHandleOAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    exchangeCodeForToken(code);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

loginBtn.addEventListener('click', () => {
  if (!config.githubClientId || config.githubClientId === 'YOUR_GITHUB_OAUTH_APP_CLIENT_ID') {
    alert('Set githubClientId in docs/config.js first.');
    return;
  }
  window.location.href = buildGithubAuthUrl();
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  window.location.reload();
});

checkForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  results.textContent = 'Loading...';

  try {
    const payload = {
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      state: document.getElementById('state').value || undefined,
      dob: document.getElementById('dob').value || undefined,
    };

    const res = await fetch(`${config.apiBaseUrl}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    results.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    results.textContent = `Error: ${err.message}`;
  }
});

maybeHandleOAuthRedirect();
loadUser().catch(err => {
  console.error(err);
  clearToken();
});
