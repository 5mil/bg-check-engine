const axios = require('axios');

/**
 * New York State Comprehensive Arrest & Blotter Records
 *
 * Sources:
 * 1. NYPD Arrest Data (NYC Open Data / Socrata) - historical + YTD
 * 2. NYPD Crime Data (NYC Open Data)
 * 3. NY State Police Blotter (publicapps.troopers.ny.gov)
 * 4. data.ny.gov - Adult Arrests by County (statewide)
 * 5. County jail rosters via public APIs
 */

const SOCRATA_TOKEN = process.env.SOCRATA_APP_TOKEN || '';
const socrataHeaders = SOCRATA_TOKEN ? { 'X-App-Token': SOCRATA_TOKEN } : {};

// --- 1. NYPD Arrest Data YTD (name-searchable) ---
async function searchNYPDArrestsYTD(firstName, lastName) {
  try {
    const fullName = `${lastName.toUpperCase()}, ${firstName.toUpperCase()}`;
    const res = await axios.get(
      'https://data.cityofnewyork.us/resource/uip8-fykc.json',
      {
        headers: socrataHeaders,
        params: { ofns_desc: undefined, $where: `perp_last_nm='${lastName.toUpperCase()}' AND perp_first_nm='${firstName.toUpperCase()}'`, $limit: 10 },
        timeout: 9000,
      }
    );
    const records = res.data || [];
    return {
      source: 'NYPD Arrests (Year to Date)',
      count: records.length,
      records: records.map(r => ({
        date: r.arrest_date,
        offense: r.ofns_desc,
        lawCategory: r.law_cat_cd === 'F' ? 'Felony' : r.law_cat_cd === 'M' ? 'Misdemeanor' : r.law_cat_cd,
        borough: r.arrest_boro,
        age: r.age_group,
        pd_desc: r.pd_desc,
      })),
    };
  } catch (err) {
    return { source: 'NYPD Arrests (YTD)', error: err.message };
  }
}

// --- 2. NYPD Arrest Data Historic ---
async function searchNYPDArrestsHistoric(firstName, lastName) {
  try {
    const res = await axios.get(
      'https://data.cityofnewyork.us/resource/8h9b-rp9u.json',
      {
        headers: socrataHeaders,
        params: { $where: `perp_last_nm='${lastName.toUpperCase()}' AND perp_first_nm='${firstName.toUpperCase()}'`, $limit: 10 },
        timeout: 9000,
      }
    );
    const records = res.data || [];
    return {
      source: 'NYPD Arrests (Historic 2006–2023)',
      count: records.length,
      records: records.map(r => ({
        date: r.arrest_date,
        offense: r.ofns_desc,
        lawCategory: r.law_cat_cd === 'F' ? 'Felony' : r.law_cat_cd === 'M' ? 'Misdemeanor' : r.law_cat_cd,
        borough: r.arrest_boro,
        pd_desc: r.pd_desc,
      })),
    };
  } catch (err) {
    return { source: 'NYPD Arrests (Historic)', error: err.message };
  }
}

// --- 3. NYS Adult Arrests by County (data.ny.gov) ---
async function searchNYSAdultArrests(firstName, lastName) {
  try {
    // Statewide county-level arrest data — aggregated, not name-searchable
    // Return as reference link instead
    return {
      source: 'NYS Adult Arrests by County (data.ny.gov)',
      note: 'Aggregate data — individual name lookup via FOIL request',
      lookupUrl: `https://data.ny.gov/browse?q=arrests&category=Public+Safety`,
      count: 0,
      records: [],
    };
  } catch (err) {
    return { source: 'NYS Adult Arrests', error: err.message };
  }
}

// --- 4. NY State Police Blotter ---
async function searchNYSPBlotter(firstName, lastName) {
  try {
    // NYSP blotter is published as PDFs per troop/zone — no name-search API
    // Return structured links to each troop's blotter
    return {
      source: 'NY State Police Blotter',
      note: 'Daily blotter PDFs — no name-search API available',
      lookupUrl: 'https://publicapps.troopers.ny.gov/Media_Reports/',
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(firstName + ' ' + lastName)}+site:troopers.ny.gov`,
      count: 0,
      records: [],
    };
  } catch (err) {
    return { source: 'NY State Police', error: err.message };
  }
}

// --- 5. County Jail Rosters (public APIs) ---
const NYS_COUNTY_JAILS = [
  {
    name: 'Montgomery County Jail Roster',
    url: 'https://api.mcgtn.org/publicinquiry/inmateroster/search',
    method: 'get',
    params: (fn, ln) => ({ lastname: ln, firstname: fn }),
  },
];

async function searchCountyJails(firstName, lastName) {
  const results = await Promise.allSettled(
    NYS_COUNTY_JAILS.map(async jail => {
      try {
        const res = await axios.get(jail.url, {
          params: jail.params(firstName, lastName),
          timeout: 8000,
        });
        const records = Array.isArray(res.data) ? res.data : res.data?.results || [];
        return { source: jail.name, count: records.length, records: records.slice(0, 10) };
      } catch (err) {
        return { source: jail.name, error: err.message };
      }
    })
  );

  return results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message });
}

// --- 6. NYS DOCCS (Dept of Corrections) incarceration lookup ---
async function searchNYSDOCCS(firstName, lastName) {
  try {
    // DOCCS has a public inmate lookup at https://nysdoccslookup.doccs.ny.gov
    // No public REST API — return lookup link
    return {
      source: 'NYS DOCCS Inmate Lookup',
      note: 'NY Dept of Corrections — state prison records',
      lookupUrl: `https://nysdoccslookup.doccs.ny.gov/GCA00P00/WIQ1/WINQ130`,
      count: 0,
      records: [],
    };
  } catch (err) {
    return { source: 'NYS DOCCS', error: err.message };
  }
}

// --- Master search ---
async function search({ firstName, lastName, state }) {
  // Only run if state is NY or not specified
  if (state && state.toUpperCase() !== 'NY') {
    return { source: 'NYS Records', skipped: true, reason: `State filter is ${state}, not NY` };
  }

  const [nypd_ytd, nypd_hist, nys_arrests, nysp, doccs] = await Promise.allSettled([
    searchNYPDArrestsYTD(firstName, lastName),
    searchNYPDArrestsHistoric(firstName, lastName),
    searchNYSAdultArrests(firstName, lastName),
    searchNYSPBlotter(firstName, lastName),
    searchNYSDOCCS(firstName, lastName),
  ]);

  const countyJails = await searchCountyJails(firstName, lastName);

  const unwrap = r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message };

  const allSources = [
    unwrap(nypd_ytd),
    unwrap(nypd_hist),
    unwrap(nys_arrests),
    unwrap(nysp),
    unwrap(doccs),
    ...countyJails,
  ];

  const totalCount = allSources.reduce((sum, s) => sum + (s.count || 0), 0);

  return {
    source: 'New York State Records',
    totalCount,
    byJurisdiction: allSources,
  };
}

module.exports = { search };
