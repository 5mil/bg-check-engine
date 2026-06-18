const courtListener = require('./providers/courtListener');
const nsopw = require('./providers/nsopw');
const openSanctions = require('./providers/openSanctions');
const judyRecords = require('./providers/judyRecords');

/**
 * runCheck - Orchestrates all public record providers in parallel.
 * @param {object} params - { firstName, lastName, state, dob }
 * @returns {object} Aggregated results keyed by provider
 */
async function runCheck({ firstName, lastName, state, dob }) {
  const query = { firstName, lastName, state, dob };

  const [courts, offenders, sanctions, stateRecords] = await Promise.allSettled([
    courtListener.search(query),
    nsopw.search(query),
    openSanctions.search(query),
    judyRecords.search(query),
  ]);

  return {
    courtListener: courts.status === 'fulfilled' ? courts.value : { error: courts.reason?.message },
    nsopw: offenders.status === 'fulfilled' ? offenders.value : { error: offenders.reason?.message },
    openSanctions: sanctions.status === 'fulfilled' ? sanctions.value : { error: sanctions.reason?.message },
    judyRecords: stateRecords.status === 'fulfilled' ? stateRecords.value : { error: stateRecords.reason?.message },
    meta: {
      query: { firstName, lastName, state, dob },
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = { runCheck };
