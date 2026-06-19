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

// ─── Report Renderer ───────────────────────────────────────────────

function statusBadge(count, hasError, isLink) {
  if (hasError)  return '<span class="badge badge-error">Error</span>';
  if (isLink)    return '<span class="badge badge-link">Manual Check</span>';
  if (count > 0) return `<span class="badge badge-hit">${count} record${count !== 1 ? 's' : ''}</span>`;
  return '<span class="badge badge-clear">Clear</span>';
}

function linkBtn(label, url) {
  if (!url) return '';
  return `<a href="${url}" target="_blank" rel="noopener" class="link-btn">${label} &rarr;</a>`;
}

function renderRecordTable(records) {
  if (!records || !records.length) return '';
  const keys = Object.keys(records[0]).filter(k =>
    records[0][k] !== null && records[0][k] !== undefined && k !== 'url'
  );
  const urlKey = Object.keys(records[0]).find(k => k === 'url' || k === 'lookupUrl');
  const header = keys.map(k => `<th>${k.replace(/_/g,' ')}</th>`).join('') + (urlKey ? '<th></th>' : '');
  const rows = records.map(r =>
    `<tr>${keys.map(k => `<td>${r[k] !== null && r[k] !== undefined ? String(r[k]).slice(0, 140) : '&mdash;'}</td>`).join('')}
    ${urlKey && r[urlKey] ? `<td><a href="${r[urlKey]}" target="_blank" class="ext-link">View</a></td>` : (urlKey ? '<td></td>' : '')}
    </tr>`
  ).join('');
  return `<div class="table-wrap"><table class="rec-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Render a single source block — always shows something
function renderSource(key, data) {
  if (!data) return '';
  if (data.skipped) return ''; // state-filtered out

  const hasError  = !!data.error;
  const count     = data.count ?? data.totalCount ?? (data.records?.length || 0);
  const label     = data.source || key;

  // Detect link-only sources (no real API result)
  const isLinkOnly = !hasError && count === 0 &&
    (data.lookupUrl || data.googleSearch || data.searchUrl || data.mainUrl) &&
    !(data.records?.length) && !(data.byJurisdiction) && !(data.results);

  let body = '';

  if (hasError) {
    // Still show lookup links even on error
    body = `<p class="rec-error">&#9888; ${data.error}</p>`;
    if (data.lookupUrl) body += `<div class="link-row">${linkBtn('Search Manually', data.lookupUrl)}</div>`;

  } else if (data.byJurisdiction) {
    // Nested multi-jurisdiction (arrests, nys, saratoga)
    body = data.byJurisdiction.map(j => {
      if (!j || j.skipped) return '';
      const jLinks = [j.lookupUrl, j.googleSearch, j.searchUrl, j.mainUrl].filter(Boolean);
      let jBody = '';
      if (j.error) {
        jBody = `<span class="rec-error">${j.error}</span>`;
        if (jLinks[0]) jBody += ` ${linkBtn('Check', jLinks[0])}`;
      } else if (j.count > 0 && j.records?.length) {
        jBody = renderRecordTable(j.records);
      } else if (j.troops) {
        // NYSP troop list
        jBody = j.troops.map(t =>
          `<span class="troop-tag">${t.troop} &mdash; ${t.region}</span>`
        ).join('') + (j.mainUrl ? `<div class="link-row" style="margin-top:10px">${linkBtn('Open NYSP Blotter Portal', j.mainUrl)}${j.googleSearch ? linkBtn('Search by Name', j.googleSearch) : ''}</div>` : '');
      } else {
        // Link-only sub-source — always show name + links
        jBody = jLinks.map((u, i) => linkBtn(i === 0 ? 'Open' : (j.googleSearch === u ? 'Search by Name' : 'Search'), u)).join(' ');
        if (j.note)  jBody += `<p class="source-note">${j.note}</p>`;
        if (j.note2) jBody += `<p class="source-note">${j.note2}</p>`;
        if (j.phone) jBody += `<p class="source-note">&#128222; ${j.phone}</p>`;
        if (j.address) jBody += `<p class="source-note">&#128205; ${j.address}</p>`;
      }
      return `<div class="sub-source"><div class="sub-source-name">${j.source || ''}</div><div class="sub-source-body">${jBody}</div></div>`;
    }).filter(Boolean).join('');

  } else if (data.results) {
    body = data.results.map(r => {
      if (r.lookupUrl) return `<div class="link-row">${linkBtn(r.source || 'Search', r.lookupUrl)}<span class="source-note">${r.note || ''}</span></div>`;
      if (r.error)     return `<p class="rec-error">${r.error}</p>`;
      return '';
    }).join('');

  } else if (count > 0 && data.records?.length) {
    body = renderRecordTable(data.records);
    if (data.lookupUrl) body += `<div class="link-row" style="margin-top:8px">${linkBtn('View Full Record', data.lookupUrl)}</div>`;

  } else if (isLinkOnly) {
    // Link-only source — render rich card with all links and metadata
    const links = [
      data.lookupUrl   && linkBtn('Open', data.lookupUrl),
      data.searchUrl   && linkBtn('Case Search', data.searchUrl),
      data.googleSearch && linkBtn('Search by Name', data.googleSearch),
      data.mainUrl     && linkBtn('Open Portal', data.mainUrl),
    ].filter(Boolean);
    body = `<div class="link-row">${links.join('')}</div>`;
    if (data.note)    body += `<p class="source-note">${data.note}</p>`;
    if (data.note2)   body += `<p class="source-note">${data.note2}</p>`;
    if (data.phone)   body += `<p class="source-note">&#128222; ${data.phone}</p>`;
    if (data.address) body += `<p class="source-note">&#128205; ${data.address}</p>`;

  } else {
    body = `<p class="muted">No records found in this database.</p>`;
    if (data.lookupUrl) body += `<div class="link-row">${linkBtn('Verify Manually', data.lookupUrl)}</div>`;
  }

  const borderClass = hasError ? 'source-error' : isLinkOnly ? 'source-link' : count > 0 ? 'source-hit' : 'source-clear';

  return `
    <div class="report-source ${borderClass}">
      <div class="source-header">
        <span class="source-name">${label}</span>
        ${statusBadge(count, hasError, isLinkOnly)}
      </div>
      <div class="source-body">${body}</div>
    </div>`;
}

function renderReport(data, query) {
  const { meta, ...sources } = data;
  const totalHits = Object.values(sources).reduce((sum, s) =>
    sum + (s?.count ?? s?.totalCount ?? (s?.records?.length || 0)), 0);
  const hasHits = totalHits > 0;

  const summary = `
    <div class="report-header">
      <div>
        <h2 class="report-title">Background Check Report</h2>
        <p class="report-subject">${query.firstName} ${query.lastName}${query.state ? ' &middot; ' + query.state.toUpperCase() : ''}${query.dob ? ' &middot; DOB ' + query.dob : ''}</p>
        <p class="muted report-time">Generated ${new Date(meta?.timestamp || Date.now()).toLocaleString()}</p>
      </div>
      <div class="report-verdict ${hasHits ? 'verdict-hit' : 'verdict-clear'}">
        ${hasHits ? '&#9888; Records Found' : '&#10003; No Automatic Hits'}
      </div>
    </div>`;

  const rendered = Object.keys(sources).map(k => renderSource(k, sources[k])).join('');
  return `${summary}<div class="report-sources">${rendered}</div>`;
}

function mockResults(payload) {
  return {
    courtListener: { source: 'CourtListener', count: 1, records: [{ caseName: `${payload.firstName} ${payload.lastName} v. Example Corp`, court: 'S.D.N.Y.', dateFiled: '2019-03-12', status: 'Closed', url: 'https://www.courtlistener.com' }] },
    nsopw:         { source: 'NSOPW', count: 0, records: [] },
    openSanctions: { source: 'OpenSanctions', count: 0, records: [] },
    judyRecords:   { source: 'JudyRecords', count: 0, records: [] },
    fbi:           { source: 'FBI Most Wanted', count: 0, records: [] },
    ofac:          { source: 'OFAC Sanctions', count: 0, records: [] },
    interpol:      { source: 'Interpol', count: 0, records: [] },
    saratogaCounty: {
      source: 'Saratoga County, NY — Public Safety Records',
      totalCount: 0,
      byJurisdiction: [
        { source: 'Saratoga County Sheriff — Jail Roster', count: 0, records: [], lookupUrl: 'https://saratogacountysheriff.gov/corrections-division/', note: 'Active inmates at Saratoga County Correctional Facility', phone: '(518) 885-6761' },
        { source: 'NYSP Troop G — Hudson Valley Blotter', count: 0, records: [], mainUrl: 'https://publicapps.troopers.ny.gov/Media_Reports/', googleSearch: `https://www.google.com/search?q=${encodeURIComponent('"' + payload.firstName + ' ' + payload.lastName + '"')}+site:troopers.ny.gov` },
      ]
    },
    meta: { query: payload, timestamp: new Date().toISOString() }
  };
}

// ─── Events ────────────────────────────────────────────────────────

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
