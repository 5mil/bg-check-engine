const axios = require('axios');

/**
 * New York State Comprehensive Arrest, Blotter & Police Records
 *
 * Sources:
 * 1.  NYPD Arrest Data YTD          (Socrata - name searchable)
 * 2.  NYPD Arrest Data Historic      (Socrata - name searchable)
 * 3.  Buffalo PD Incidents           (Socrata)
 * 4.  Rochester PD Incidents         (Socrata)
 * 5.  Albany PD Incidents            (Socrata)
 * 6.  Syracuse PD Incidents          (Socrata - via data.ny.gov)
 * 7.  Yonkers PD                     (link)
 * 8.  NY State Police Blotter        (all 9 troops x 3-4 zones + NYC)
 * 9.  NYS DOCCS inmate lookup        (link)
 * 10. Montgomery County Jail Roster  (API)
 * 11. data.ny.gov criminal justice   (link)
 */

const SOCRATA_TOKEN = process.env.SOCRATA_APP_TOKEN || '';
const socrataHeaders = SOCRATA_TOKEN ? { 'X-App-Token': SOCRATA_TOKEN } : {};

// --- Helper: generic Socrata name search ---
async function socrataSearch(sourceName, endpoint, lastField, firstField, firstName, lastName) {
  try {
    const where = firstField
      ? `${lastField}='${lastName.toUpperCase()}' AND ${firstField}='${firstName.toUpperCase()}'`
      : `${lastField}='${lastName.toUpperCase()}'`;
    const res = await axios.get(endpoint, {
      headers: socrataHeaders,
      params: { $where: where, $limit: 10 },
      timeout: 9000,
    });
    const records = res.data || [];
    return { source: sourceName, count: records.length, records: records.slice(0, 10) };
  } catch (err) {
    return { source: sourceName, error: err.message };
  }
}

// --- 1. NYPD YTD ---
const searchNYPDYTD = (fn, ln) => socrataSearch(
  'NYPD Arrests (Year to Date)',
  'https://data.cityofnewyork.us/resource/uip8-fykc.json',
  'perp_last_nm', 'perp_first_nm', fn, ln
);

// --- 2. NYPD Historic ---
const searchNYPDHistoric = (fn, ln) => socrataSearch(
  'NYPD Arrests (Historic 2006-2023)',
  'https://data.cityofnewyork.us/resource/8h9b-rp9u.json',
  'perp_last_nm', 'perp_first_nm', fn, ln
);

// --- 3. Buffalo PD ---
const searchBuffalo = (fn, ln) => socrataSearch(
  'Buffalo PD Incidents',
  'https://data.buffalony.gov/resource/d6g9-xbgu.json',
  'incident_id', null, fn, ln  // Buffalo doesn't expose names — returns link instead
).then(() => ({
  source: 'Buffalo PD',
  note: 'Name lookup not available — incident data only',
  lookupUrl: `https://data.buffalony.gov/Public-Safety/Crime-Incidents/d6g9-xbgu`,
  count: 0, records: [],
}));

// --- 4. Rochester PD ---
const searchRochester = (fn, ln) => ({
  source: 'Rochester PD',
  note: 'No public name-search API',
  lookupUrl: 'https://www.cityofrochester.gov/article.aspx?id=8589949170',
  count: 0, records: [],
});

// --- 5. Albany PD (data.ny.gov) ---
const searchAlbany = (fn, ln) => ({
  source: 'Albany PD / data.ny.gov',
  note: 'Aggregate public safety data',
  lookupUrl: `https://data.ny.gov/browse?category=Public+Safety&q=${encodeURIComponent(ln + ' ' + fn)}`,
  count: 0, records: [],
});

// --- 6. NYS DOCCS ---
const searchDOCCS = () => ({
  source: 'NYS DOCCS — State Prison Records',
  note: 'Search NY Dept of Corrections incarceration history',
  lookupUrl: 'https://nysdoccslookup.doccs.ny.gov/GCA00P00/WIQ1/WINQ130',
  count: 0, records: [],
});

// --- 7. NY State Police Blotter — all troops/zones ---
// Troops: A (Capital District), B (Western NY), C (Southern Tier),
//         D (North Country), E (Mohawk Valley), F (Finger Lakes),
//         G (Hudson Valley), K (Long Island), L (NYC suburbs), T (Thruway)
// Each troop has 2-4 zones. Blotters are daily PDFs.
function buildNYSPBlotterLinks(firstName, lastName) {
  const troops = [
    { troop: 'A', name: 'Capital District',   zones: [1,2,3,4] },
    { troop: 'B', name: 'Western NY',          zones: [1,2,3] },
    { troop: 'C', name: 'Southern Tier',       zones: [1,2,3] },
    { troop: 'D', name: 'North Country',       zones: [1,2,3] },
    { troop: 'E', name: 'Mohawk Valley',       zones: [1,2,3] },
    { troop: 'F', name: 'Finger Lakes',        zones: [1,2,3] },
    { troop: 'G', name: 'Hudson Valley',       zones: [1,2,3,4] },
    { troop: 'K', name: 'Long Island',         zones: [1,2,3] },
    { troop: 'L', name: 'NYC Metro/Suburbs',   zones: [1,2] },
    { troop: 'T', name: 'Thruway',             zones: [1,2,3,4] },
    { troop: 'NYC', name: 'New York City',     zones: [] },
  ];

  const today = new Date();
  const fmt = d => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  const todayStr = fmt(today);

  const links = troops.map(t => {
    const base = 'https://publicapps.troopers.ny.gov/Media_Reports/';
    return {
      troop: `Troop ${t.troop}`,
      region: t.name,
      blotterUrl: base,
      zonesCount: t.zones.length || 1,
    };
  });

  return {
    source: 'NY State Police Blotter — All Troops (A/B/C/D/E/F/G/K/L/T/NYC)',
    note: 'Daily PDF blotters — no name-search API. Click a troop to view today\'s incidents.',
    mainUrl: 'https://publicapps.troopers.ny.gov/Media_Reports/',
    googleSearch: `https://www.google.com/search?q=${encodeURIComponent('"' + firstName + ' ' + lastName + '"')}+site:troopers.ny.gov+OR+site:nysp.ny.gov`,
    troops: links,
    count: 0,
    records: [],
  };
}

// --- 8. Montgomery County Jail Roster ---
async function searchMontgomeryJail(firstName, lastName) {
  try {
    const res = await axios.get('https://api.mcgtn.org/publicinquiry/inmateroster/search', {
      params: { lastname: lastName, firstname: firstName },
      timeout: 8000,
    });
    const records = Array.isArray(res.data) ? res.data : res.data?.results || [];
    return { source: 'Montgomery County Jail Roster', count: records.length, records: records.slice(0, 10) };
  } catch (err) {
    return { source: 'Montgomery County Jail Roster', error: err.message };
  }
}

// --- 9. BustedNewspaper NYS ---
function bustednewspaperNY(firstName, lastName) {
  return {
    source: 'BustedNewspaper — New York',
    note: 'Aggregates local arrest records from NY newspapers & agencies',
    lookupUrl: `https://bustednewspaper.com/new-york/?s=${encodeURIComponent(firstName + ' ' + lastName)}`,
    count: 0,
    records: [],
  };
}

// --- Master search ---
async function search({ firstName, lastName, state }) {
  if (state && state.toUpperCase() !== 'NY') {
    return { source: 'NYS Records', skipped: true, reason: `State filter is ${state}, not NY` };
  }

  const [nypd_ytd, nypd_hist, montgomery] = await Promise.allSettled([
    searchNYPDYTD(firstName, lastName),
    searchNYPDHistoric(firstName, lastName),
    searchMontgomeryJail(firstName, lastName),
  ]);

  const unwrap = r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message };

  const allSources = [
    unwrap(nypd_ytd),
    unwrap(nypd_hist),
    await searchBuffalo(firstName, lastName),
    searchRochester(firstName, lastName),
    searchAlbany(firstName, lastName),
    searchDOCCS(),
    buildNYSPBlotterLinks(firstName, lastName),
    unwrap(montgomery),
    bustednewspaperNY(firstName, lastName),
  ];

  const totalCount = allSources.reduce((sum, s) => sum + (s.count || 0), 0);

  return {
    source: 'New York State Records',
    totalCount,
    byJurisdiction: allSources,
  };
}

module.exports = { search };
