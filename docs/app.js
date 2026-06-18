const config = window.BGCHECK_CONFIG;

const loginBtn    = document.getElementById('loginBtn');
const logoutBtn   = document.getElementById('logoutBtn');
const userCard    = document.getElementById('userCard');
const toolCard    = document.getElementById('toolCard');
const avatar      = document.getElementById('avatar');
const userName    = document.getElementById('userName');
const userLogin   = document.getElementById('userLogin');
const report      = document.getElementById('report');
const checkForm   = document.getElementById('checkForm');
const submitBtn   = document.getElementById('submitBtn');
const spinner     = document.getElementById('spinner');
const setupBanner = document.getElementById('setupBanner');

if (config.githubClientId && config.oauthWorkerUrl && config.apiBaseUrl) {
  setupBanner.classList.add('hidden');
}

const saveToken  = t => localStorage.setItem('github_token', t);
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
  if (!config.oauthWorkerUrl) { alert('oauthWorkerUrl not set.'); return; }
  try {
    saveToken(await exchangeCode(code));
    await loadUser();
  } catch (e) { alert(`Login failed: ${e.message}`); }
}

// --- Report Renderer ---

function statusBadge(count, hasError) {
  if (hasError) return '<span class="badge badge-error">Error</span>';
  if (count > 0) return `<span class="badge badge-hit">${count} record${count !== 1 ? 's' : ''}</span>`;
  return '<span class="badge badge-clear">Clear</span>';
}

function renderRecordTable(records) {
  if (!records || records.length === 0) return '';
  const keys = Object.keys(records[0]).filter(k => records[0][k] !== null && records[0][k] !== undefined);
  const header = keys.map(k => `<th>${k.replace(/_/g,' ')}</th>`).join('');
  const rows = records.map(r =>
    `<tr>${keys.map(k => `<td>${r[k] !== null && r[k] !== undefined ? String(r[k]).slice(0, 120) : ''}</td>`).join('')}</tr>`
  ).join('');
  return `<div class="table-wrap"><table class="rec-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderSource(key, data) {
  if (!data) return '';
  const hasError = !!data.error;
  const count = data.count ?? data.totalCount ?? (data.records?.length || 0);
  const label = data.source || key;

  let body = '';

  if (hasError) {
    body = `<p class="rec-error">&#9888; ${data.error}</p>`;
  } else if (data.records && data.records.length > 0) {
    body = renderRecordTable(data.records);
  } else if (data.byJurisdiction) {
    // Arrest records — nested by city
    body = data.byJurisdiction.map(j => {
      if (j.error) return `<p class="rec-error">${j.source}: ${j.error}</p>`;
      if (j.count === 0) return `<p class="muted">${j.source}: No records found</p>`;
      return `<p><strong>${j.source}</strong></p>${renderRecordTable(j.records)}`;
    }).join('');
  } else if (data.results) {
    body = data.results.map(r => {
      if (r.lookupUrl) return `<p><a href="${r.lookupUrl}" target="_blank" class="ext-link">&#128269; ${r.source} &rarr; Search manually</a><br><span class="muted">${r.note || ''}</span></p>`;
      if (r.error) return `<p class="rec-error">${r.error}</p>`;
      return `<p class="muted">${r.source}: No data</p>`;
    }).join('');
  } else {
    body = `<p class="muted">No records found.</p>`;
  }

  return `
    <div class="report-source ${hasError ? 'source-error' : count > 0 ? 'source-hit' : 'source-clear'}">
      <div class="source-header">
        <span class="source-name">${label}</span>
        ${statusBadge(count, hasError)}
      </div>
      <div class="source-body">${body}</div>
    </div>`;
}

function renderReport(data, query) {
  const { meta, ...sources } = data;
  const allCounts = Object.values(sources).reduce((sum, s) => sum + (s?.count ?? s?.totalCount ?? (s?.records?.length || 0)), 0);
  const hasHits = allCounts > 0;

  const summary = `
    <div class="report-header">
      <div>
        <h2 class="report-title">Background Check Report</h2>
        <p class="report-subject">${query.firstName} ${query.lastName}${query.state ? ' &middot; ' + query.state.toUpperCase() : ''}${query.dob ? ' &middot; DOB ' + query.dob : ''}</p>
        <p class="muted report-time">Generated ${new Date(meta?.timestamp || Date.now()).toLocaleString()}</p>
      </div>
      <div class="report-verdict ${hasHits ? 'verdict-hit' : 'verdict-clear'}">
        ${hasHits ? '&#9888; Records Found' : '&#10003; No Records Found'}
      </div>
    </div>`;

  const sourceKeys = Object.keys(sources);
  const rendered = sourceKeys.map(k => renderSource(k, sources[k])).join('');

  return `${summary}<div class="report-sources">${rendered}</div>`;
}

function mockResults(payload) {
  return {
    courtListener: { source: 'CourtListener', count: 1, records: [{ caseName: `${payload.firstName} ${payload.lastName} v. Example Corp`, court: 'S.D.N.Y.', dateFiled: '2019-03-12', status: 'Closed' }] },
    nsopw:         { source: 'NSOPW', count: 0, records: [] },
    openSanctions: { source: 'OpenSanctions', count: 0, records: [] },
    judyRecords:   { source: 'JudyRecords', count: 0, records: [] },
    fbi:           { source: 'FBI Most Wanted', count: 0, records: [] },
    ofac:          { source: 'OFAC Sanctions', count: 0, records: [] },
    interpol:      { source: 'Interpol', count: 0, records: [] },
    meta: { query: payload, timestamp: new Date().toISOString() }
  };
}

// --- Events ---

loginBtn.addEventListener('click', () => {
  if (!config.githubClientId) { alert('Set githubClientId in config.js'); return; }
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
  report.classList.add('hidden');
  report.innerHTML = '';

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
    report.innerHTML = renderReport(data, payload);
    report.classList.remove('hidden');
  } catch (err) {
    report.innerHTML = `<div class="report-source source-error"><p class="rec-error">&#9888; ${err.message}</p></div>`;
    report.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

maybeHandleOAuthRedirect().then(() => loadUser()).catch(() => clearToken());
