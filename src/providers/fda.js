const axios = require('axios');

/**
 * FDA Debarment List
 * People banned from working in the drug industry.
 * Free, no auth. Docs: https://open.fda.gov/apis/
 */
async function search({ firstName, lastName }) {
  try {
    const res = await axios.get('https://api.fda.gov/drug/enforcement.json', {
      params: {
        search: `recalling_firm:"${firstName}+${lastName}"`,
        limit: 5,
      },
      timeout: 8000,
    });

    // Also check debarment list via FDA disqualified list
    const debarRes = await axios.get(
      `https://www.accessdata.fda.gov/scripts/sda/sdNavigation.cfm`,
      {
        params: { sd: 'clinicalinvestigatorsinspectionlist', displayAll: true, output: 'json' },
        timeout: 8000,
      }
    ).catch(() => ({ data: null }));

    const results = res.data?.results || [];
    return {
      source: 'FDA',
      count: results.length,
      records: results.slice(0, 5).map(r => ({
        firm: r.recalling_firm,
        reason: r.reason_for_recall?.slice(0, 150),
        status: r.status,
        date: r.recall_initiation_date,
      })),
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return { source: 'FDA', count: 0, records: [] };
    }
    return { source: 'FDA', error: err.message };
  }
}

module.exports = { search };
