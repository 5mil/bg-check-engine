const axios = require('axios');

/**
 * Search OpenSanctions — global sanctions, PEP, and watchlist database.
 * Free tier available. Docs: https://www.opensanctions.org/api/
 */
async function search({ firstName, lastName }) {
  const fullName = `${firstName} ${lastName}`;
  const API_KEY = process.env.OPENSANCTIONS_API_KEY || '';

  const headers = API_KEY ? { Authorization: `ApiKey ${API_KEY}` } : {};

  const res = await axios.get('https://api.opensanctions.org/search/default', {
    headers,
    params: {
      q: fullName,
      schema: 'Person',
      limit: 10,
    },
    timeout: 10000,
  });

  const results = res.data?.results || [];
  return {
    source: 'OpenSanctions',
    count: results.length,
    records: results.map(r => ({
      name: r.caption,
      score: r.score,
      datasets: r.datasets,
      topics: r.properties?.topics || [],
      birthDate: r.properties?.birthDate || null,
      nationality: r.properties?.nationality || null,
    })),
  };
}

module.exports = { search };
