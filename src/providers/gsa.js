const axios = require('axios');

/**
 * GSA System for Award Management (SAM.gov) - Excluded Parties
 * Federal contractors/individuals excluded from government contracts.
 * Free API — get key at https://open.gsa.gov/apis/sam/
 */
async function search({ firstName, lastName }) {
  const apiKey = process.env.GSA_API_KEY || 'DEMO_KEY';

  try {
    const res = await axios.get('https://api.sam.gov/entity-information/v3/entities', {
      params: {
        api_key: apiKey,
        exclusionStatusFlag: 'Y',
        legalBusinessName: `${firstName} ${lastName}`,
        includeSections: 'exclusionDetails',
        pageSize: 10,
      },
      timeout: 10000,
    });

    const entities = res.data?.entityData || [];
    return {
      source: 'GSA Excluded Parties (SAM.gov)',
      count: entities.length,
      records: entities.map(e => ({
        name: e.entityRegistration?.legalBusinessName,
        exclusionType: e.exclusionDetails?.exclusionType,
        exclusionProgram: e.exclusionDetails?.exclusionProgram,
        activeDate: e.exclusionDetails?.activationDate,
        terminationDate: e.exclusionDetails?.terminationDate,
      })),
    };
  } catch (err) {
    if (err.response?.status === 404) return { source: 'GSA SAM.gov', count: 0, records: [] };
    return { source: 'GSA SAM.gov', error: err.message };
  }
}

module.exports = { search };
