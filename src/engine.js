const courtListener  = require('./providers/courtListener');
const nsopw          = require('./providers/nsopw');
const openSanctions  = require('./providers/openSanctions');
const judyRecords    = require('./providers/judyRecords');
const fbi            = require('./providers/fbi');
const ofac           = require('./providers/ofac');
const fda            = require('./providers/fda');
const gsa            = require('./providers/gsa');
const interpol       = require('./providers/interpol');

/**
 * runCheck - Orchestrates all public record providers in parallel.
 * @param {object} params - { firstName, lastName, state, dob }
 * @returns {object} Aggregated results keyed by provider
 */
async function runCheck({ firstName, lastName, state, dob }) {
  const query = { firstName, lastName, state, dob };

  const [
    courts, offenders, sanctions, stateRecords,
    fbiResult, ofacResult, fdaResult, gsaResult, interpolResult
  ] = await Promise.allSettled([
    courtListener.search(query),
    nsopw.search(query),
    openSanctions.search(query),
    judyRecords.search(query),
    fbi.search(query),
    ofac.search(query),
    fda.search(query),
    gsa.search(query),
    interpol.search(query),
  ]);

  const unwrap = r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message };

  return {
    courtListener:  unwrap(courts),
    nsopw:          unwrap(offenders),
    openSanctions:  unwrap(sanctions),
    judyRecords:    unwrap(stateRecords),
    fbi:            unwrap(fbiResult),
    ofac:           unwrap(ofacResult),
    fda:            unwrap(fdaResult),
    gsa:            unwrap(gsaResult),
    interpol:       unwrap(interpolResult),
    meta: {
      query: { firstName, lastName, state, dob },
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = { runCheck };
