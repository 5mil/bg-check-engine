const axios = require('axios');

/**
 * CrimeMapping.com API
 * Powers police blotters for 1,500+ agencies across the US.
 * Returns incident reports near a location — not name-searchable directly,
 * but useful for address-based lookups.
 * Docs: https://www.crimemapping.com/
 *
 * For name-based lookups we use the county jail roster APIs
 * that many sheriff offices publish.
 */

// Public county jail roster endpoints (many sheriffs publish these)
const JAIL_ROSTERS = [
  {
    name: 'Leon County (FL) Jail Roster',
    url: 'https://www.leoncountyfl.gov/Sheriff/Inmate-Lookup',
    type: 'html', // scraping required
  },
  {
    name: 'Harris County (TX) Jail Roster',
    url: 'https://www.harriscountytx.gov/inmates',
    type: 'html',
  },
];

/**
 * Busted! Newspaper / local arrest aggregators
 * Many states have open arrest record aggregators.
 */
async function searchBustedNewspaper(firstName, lastName, state) {
  // bustednewspaper.com has state pages but no public API
  // Return a structured link for manual lookup
  const stateSlug = state ? state.toLowerCase() : '';
  return {
    source: 'BustedNewspaper (Arrest Aggregator)',
    note: 'No public API — manual lookup available',
    lookupUrl: stateSlug
      ? `https://bustednewspaper.com/${stateSlug}/?s=${encodeURIComponent(firstName + ' ' + lastName)}`
      : `https://bustednewspaper.com/?s=${encodeURIComponent(firstName + ' ' + lastName)}`,
  };
}

async function search({ firstName, lastName, state }) {
  const [busted] = await Promise.allSettled([
    searchBustedNewspaper(firstName, lastName, state),
  ]);

  return {
    source: 'CrimeMapping / Jail Rosters',
    results: [
      busted.status === 'fulfilled' ? busted.value : { error: busted.reason?.message },
    ],
  };
}

module.exports = { search };
