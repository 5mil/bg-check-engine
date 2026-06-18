const axios = require('axios');

/**
 * Arrest & Booking Records via multiple open data sources:
 * 1. FBI Crime Data API (UCR) - national arrest stats by name not available publicly
 * 2. OpenDataSoft public portals - many cities publish arrest/blotter data
 * 3. Socrata open data (used by NYPD, Chicago PD, LA, etc.)
 *
 * Socrata powers most major city open data portals.
 * Docs: https://dev.socrata.com/
 */

// Major city arrest/blotter datasets on Socrata
const SOCRATA_SOURCES = [
  {
    name: 'NYPD Arrest Data',
    url: 'https://data.cityofnewyork.us/resource/8h9b-rp9u.json',
    nameField: 'arrest_precinct', // NYPD doesn't expose full names — use case search
    state: 'NY',
  },
  {
    name: 'Chicago Arrests',
    url: 'https://data.cityofchicago.org/resource/dpt3-jri9.json',
    nameField: 'name',
    state: 'IL',
  },
  {
    name: 'Los Angeles Arrests',
    url: 'https://data.lacity.org/resource/amvf-fr72.json',
    nameField: 'arst_nm',
    state: 'CA',
  },
  {
    name: 'San Francisco Incidents',
    url: 'https://data.sfgov.org/resource/wg3w-h783.json',
    nameField: null,
    state: 'CA',
  },
  {
    name: 'Seattle Police Blotter',
    url: 'https://data.seattle.gov/resource/33kz-ixgy.json',
    nameField: 'subject_name',
    state: 'WA',
  },
];

async function searchSocrataSource(source, firstName, lastName) {
  try {
    const appToken = process.env.SOCRATA_APP_TOKEN || '';
    const headers = appToken ? { 'X-App-Token': appToken } : {};
    const fullName = `${lastName}, ${firstName}`.toUpperCase();

    const params = source.nameField
      ? { [`${source.nameField}`]: fullName, $limit: 5 }
      : { $q: `${firstName} ${lastName}`, $limit: 5 };

    const res = await axios.get(source.url, { params, headers, timeout: 8000 });
    const records = res.data || [];

    return {
      source: source.name,
      state: source.state,
      count: records.length,
      records: records.slice(0, 5),
    };
  } catch (err) {
    return { source: source.name, error: err.message };
  }
}

async function search({ firstName, lastName, state }) {
  // Filter to relevant state if provided
  const sources = state
    ? SOCRATA_SOURCES.filter(s => s.state === state.toUpperCase() || !s.state)
    : SOCRATA_SOURCES;

  const results = await Promise.allSettled(
    sources.map(s => searchSocrataSource(s, firstName, lastName))
  );

  const all = results.map(r =>
    r.status === 'fulfilled' ? r.value : { error: r.reason?.message }
  );

  const totalCount = all.reduce((sum, r) => sum + (r.count || 0), 0);

  return {
    source: 'Police Blotters / Arrest Records',
    totalCount,
    byJurisdiction: all,
  };
}

module.exports = { search };
