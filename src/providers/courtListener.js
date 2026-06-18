const axios = require('axios');

const BASE_URL = 'https://www.courtlistener.com/api/rest/v4';
const TOKEN = process.env.COURTLISTENER_TOKEN || '';

/**
 * Search federal court cases by party name.
 * Free, no auth required (token increases rate limits).
 * Docs: https://www.courtlistener.com/api/
 */
async function search({ firstName, lastName }) {
  const fullName = `${firstName} ${lastName}`;
  const headers = TOKEN ? { Authorization: `Token ${TOKEN}` } : {};

  const res = await axios.get(`${BASE_URL}/search/`, {
    headers,
    params: {
      q: fullName,
      type: 'p',          // party search
      order_by: 'score desc',
      format: 'json',
    },
  });

  const hits = res.data.results || [];
  return {
    source: 'CourtListener',
    count: hits.length,
    records: hits.slice(0, 10).map(r => ({
      caseName: r.caseName,
      court: r.court,
      dateFiled: r.dateFiled,
      url: r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : null,
      status: r.status,
    })),
  };
}

module.exports = { search };
