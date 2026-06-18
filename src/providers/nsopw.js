const axios = require('axios');

/**
 * Search the National Sex Offender Public Website (NSOPW).
 * Completely free, no API key required.
 * Docs: https://www.nsopw.gov/en/Home/Developers
 */
async function search({ firstName, lastName, state }) {
  const params = {
    firstName,
    lastName,
    ...(state ? { stateId: state } : {}),
  };

  const res = await axios.get('https://www.nsopw.gov/api/Search/Participants', {
    params,
    headers: { Accept: 'application/json' },
    timeout: 10000,
  });

  const offenders = res.data?.participants || [];
  return {
    source: 'NSOPW',
    count: offenders.length,
    records: offenders.slice(0, 10).map(o => ({
      name: `${o.firstName} ${o.lastName}`,
      state: o.stateId,
      offenseDescription: o.offenseDescription || null,
      registryUrl: o.registryUrl || null,
    })),
  };
}

module.exports = { search };
