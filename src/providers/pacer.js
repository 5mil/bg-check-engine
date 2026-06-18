const axios = require('axios');

/**
 * PACER - Federal Court Case Locator
 * Requires a free PACER account. Charges $0.10/page for documents.
 * Docs: https://pacer.uscourts.gov/file-case/system-requirements/pacer-api-documentation
 */

let pacerToken = null;
let tokenExpiry = null;

async function authenticate() {
  if (pacerToken && tokenExpiry && Date.now() < tokenExpiry) return pacerToken;

  const res = await axios.post(
    'https://pacer.login.uscourts.gov/services/cso-auth',
    {
      loginId: process.env.PACER_USERNAME,
      password: process.env.PACER_PASSWORD,
      redactFlag: '1',
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  pacerToken = res.data.loginResult?.nextGenCSO;
  tokenExpiry = Date.now() + (50 * 60 * 1000); // 50-min window
  return pacerToken;
}

async function search({ firstName, lastName }) {
  if (!process.env.PACER_USERNAME) {
    return { source: 'PACER', skipped: true, reason: 'No PACER credentials configured.' };
  }
  const token = await authenticate();
  const res = await axios.get(
    'https://pcl.uscourts.gov/pcl/pages/search/find.jsf',
    {
      headers: { 'X-NEXT-GEN-CSO': token },
      params: { firstName, lastName, courtType: 'all' },
    }
  );

  return {
    source: 'PACER',
    raw: res.data, // parse as needed per PACER HTML response
  };
}

module.exports = { search, authenticate };
