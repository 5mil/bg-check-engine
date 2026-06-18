const axios = require('axios');

/**
 * Interpol Red Notices (public API)
 * Free, no auth required.
 * Docs: https://interpol.api.bund.dev/
 */
async function search({ firstName, lastName }) {
  try {
    const res = await axios.get('https://ws-public.interpol.int/notices/v1/red', {
      params: {
        forename: firstName,
        name: lastName,
        resultPerPage: 10,
        page: 1,
      },
      timeout: 8000,
    });

    const notices = res.data?._embedded?.notices || [];
    return {
      source: 'Interpol Red Notices',
      count: res.data?.total || notices.length,
      records: notices.map(n => ({
        name: `${n.forename || ''} ${n.name || ''}`.trim(),
        nationality: n.nationalities?.join(', '),
        dob: n.date_of_birth,
        charges: n.charge,
        url: n._links?.self?.href,
      })),
    };
  } catch (err) {
    return { source: 'Interpol', error: err.message };
  }
}

module.exports = { search };
