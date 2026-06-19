const axios = require('axios');

/**
 * Saratoga County, NY — Comprehensive Public Safety Records
 *
 * Sources:
 * 1.  Saratoga County Sheriff — Corrections / Jail roster (HTML, link)
 * 2.  Saratoga County Sheriff — Law Enforcement blotter (link)
 * 3.  Saratoga County Sheriff — Sex offender registry (link)
 * 4.  Saratoga County Court Records — SearchIQS (civil + criminal, link)
 * 5.  NYS Courts E-File (NYSCEF) — case search (link)
 * 6.  NYS DOCCS — incarceration lookup (API + link)
 * 7.  Saratoga County DA — case info (link)
 * 8.  NYSP Troop G — Hudson Valley blotter (covers Saratoga) (link)
 * 9.  BustedNewspaper Saratoga County (link)
 * 10. Saratoga County FOIL request portal (link)
 */

// --- NYS DOCCS API (actual REST endpoint) ---
async function searchDOCCS(firstName, lastName) {
  try {
    // DOCCS public lookup — POST to their search endpoint
    const res = await axios.post(
      'https://nysdoccslookup.doccs.ny.gov/GCA00P00/WIQ3/WINQ135',
      new URLSearchParams({
        M00_LAST_NAMN_SRCH_K: lastName.toUpperCase(),
        M00_FRST_NAMN_SRCH_K: firstName.toUpperCase(),
        M00_MID_NAMN_SRCH_K: '',
        M00_DOB_DATE_SRCH_K: '',
        submit: 'Search',
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
        maxRedirects: 5,
      }
    );

    // Parse HTML response for inmate rows
    const html = res.data || '';
    const rows = [];
    const regex = /WIQ3\/WINQ130[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      rows.push({
        name: match[1]?.trim(),
        din: match[2]?.trim(),
        status: match[3]?.trim(),
      });
    }

    return {
      source: 'NYS DOCCS — State Prison / Parole Records',
      count: rows.length,
      records: rows.slice(0, 10),
      lookupUrl: `https://nysdoccslookup.doccs.ny.gov/GCA00P00/WIQ1/WINQ130`,
      note: rows.length === 0 ? 'No active incarceration records found — verify manually via link' : undefined,
    };
  } catch (err) {
    return {
      source: 'NYS DOCCS — State Prison / Parole Records',
      error: err.message,
      lookupUrl: 'https://nysdoccslookup.doccs.ny.gov/GCA00P00/WIQ1/WINQ130',
    };
  }
}

// --- All Saratoga County resources ---
function buildSaratogaResources(firstName, lastName) {
  const nameEncoded = encodeURIComponent(`${firstName} ${lastName}`);
  const nameQuoted  = encodeURIComponent(`"${firstName} ${lastName}"`);

  return [
    {
      source: 'Saratoga County Sheriff — Jail Roster',
      note: 'Active inmates at Saratoga County Correctional Facility (capacity 255)',
      lookupUrl: 'https://saratogacountysheriff.gov/corrections-division/',
      phone: '(518) 885-6761',
      address: '6012 County Farm Rd, Ballston Spa, NY 12020',
      count: 0, records: [],
    },
    {
      source: 'Saratoga County Sheriff — Incident Blotter',
      note: 'Law enforcement incidents, arrests, press releases',
      lookupUrl: 'https://saratogacountysheriff.gov/news/',
      googleSearch: `https://www.google.com/search?q=${nameQuoted}+saratoga+county+sheriff+arrest`,
      count: 0, records: [],
    },
    {
      source: 'Saratoga County Sheriff — Sex Offender Registry',
      note: 'NYS Sex Offender Registry — Saratoga County registrants',
      lookupUrl: `https://www.criminaljustice.ny.gov/SomsSUBDirectory/search.jsp`,
      count: 0, records: [],
    },
    {
      source: 'Saratoga County Court Records — SearchIQS',
      note: 'Civil & criminal court cases dating back to 1791. Free registration required.',
      lookupUrl: `https://www.saratogacountyny.gov/departments/county-clerk/court-records/`,
      searchUrl: 'https://iqs3.searchiq.com/saratoga',
      phone: '(518) 885-2213',
      count: 0, records: [],
    },
    {
      source: 'NYS Courts E-File (NYSCEF) — Saratoga County',
      note: 'Statewide civil & criminal e-filed cases. Free public access.',
      lookupUrl: `https://iapps.courts.state.ny.us/nyscef/CaseSearch?county=Saratoga`,
      count: 0, records: [],
    },
    {
      source: 'NYS WebCriminal — Criminal History Search',
      note: 'NY criminal history via OCA. Name search for criminal convictions statewide.',
      lookupUrl: `https://iapps.courts.state.ny.us/webcrim_attorney/DefendantSearch`,
      note2: 'Requires attorney/authorized access for full records',
      count: 0, records: [],
    },
    {
      source: 'NYSP Troop G — Hudson Valley / Capital Region Blotter',
      note: 'Troop G covers Saratoga County. Daily PDF blotter reports.',
      lookupUrl: 'https://publicapps.troopers.ny.gov/Media_Reports/',
      googleSearch: `https://www.google.com/search?q=${nameQuoted}+site:troopers.ny.gov`,
      count: 0, records: [],
    },
    {
      source: 'Saratoga Springs PD — Incident Reports',
      note: 'City of Saratoga Springs police incidents & press releases',
      lookupUrl: 'https://www.saratoga-springs.org/315/Police-Department',
      googleSearch: `https://www.google.com/search?q=${nameQuoted}+%22saratoga+springs%22+arrest+OR+police`,
      count: 0, records: [],
    },
    {
      source: 'Saratoga County District Attorney',
      note: 'Criminal prosecutions. Contact for case status.',
      lookupUrl: 'https://da.saratogacountyny.gov/',
      phone: '(518) 885-2263',
      count: 0, records: [],
    },
    {
      source: 'BustedNewspaper — Saratoga County',
      note: 'Aggregated arrest records from local Saratoga County news sources',
      lookupUrl: `https://bustednewspaper.com/?s=${nameEncoded}+saratoga`,
      count: 0, records: [],
    },
    {
      source: 'Saratoga County FOIL Request',
      note: 'Submit a Freedom of Information request for police reports, arrest records, and other county documents.',
      lookupUrl: 'https://www.saratogacountyny.gov/foil/',
      address: '40 McMaster Street, Ballston Spa, NY 12020',
      phone: '(518) 884-4770',
      count: 0, records: [],
    },
  ];
}

async function search({ firstName, lastName, state }) {
  // Run if state is NY or not specified
  if (state && state.toUpperCase() !== 'NY') {
    return { source: 'Saratoga County Records', skipped: true, reason: `State is ${state}` };
  }

  const [doccs] = await Promise.allSettled([
    searchDOCCS(firstName, lastName),
  ]);

  const unwrap = r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message };

  const resources = buildSaratogaResources(firstName, lastName);

  const allSources = [
    unwrap(doccs),
    ...resources,
  ];

  const totalCount = allSources.reduce((sum, s) => sum + (s.count || 0), 0);

  return {
    source: 'Saratoga County, NY — Public Safety Records',
    totalCount,
    byJurisdiction: allSources,
  };
}

module.exports = { search };
