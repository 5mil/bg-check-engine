const axios = require('axios');

/**
 * OFAC Sanctions Search (US Treasury)
 * Uses the free ofac-api.com public wrapper.
 * Official SDN list: https://sanctionslist.ofac.treas.gov/
 */
async function search({ firstName, lastName }) {
  try {
    const res = await axios.post(
      'https://ofac-api.com/sanctionsList/v3',
      {
        apiKey: process.env.OFAC_API_KEY || 'free',
        minScore: 85,
        source: ['SDN'],
        type: ['individual'],
        name: [{ firstName, lastName }],
      },
      { timeout: 8000 }
    );

    const matches = res.data?.matches || [];
    return {
      source: 'OFAC Sanctions (US Treasury)',
      count: matches.length,
      records: matches.map(r => ({
        name: r.name,
        score: r.score,
        programs: r.sdnType,
        remarks: r.remarks?.slice(0, 200),
      })),
    };
  } catch (err) {
    return { source: 'OFAC Sanctions', error: err.message };
  }
}

module.exports = { search };
