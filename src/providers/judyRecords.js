const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrape JudyRecords.com — 360M+ free US court records, no API key required.
 * https://www.judyrecords.com
 * Note: Add delays between requests to be respectful. Check ToS before bulk use.
 */
async function search({ firstName, lastName }) {
  const fullName = encodeURIComponent(`${firstName} ${lastName}`);
  const url = `https://www.judyrecords.com/record/${fullName}`;

  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; bg-check-engine/1.0; research use)',
      Accept: 'text/html',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(res.data);
  const records = [];

  // Parse case cards from JudyRecords HTML structure
  $('.case-card, .result-row').each((i, el) => {
    if (i >= 10) return false;
    records.push({
      caseName: $(el).find('.case-name, .name').text().trim() || null,
      court: $(el).find('.court, .jurisdiction').text().trim() || null,
      date: $(el).find('.date, .filed-date').text().trim() || null,
      caseType: $(el).find('.case-type, .type').text().trim() || null,
    });
  });

  return {
    source: 'JudyRecords',
    count: records.length,
    records,
  };
}

module.exports = { search };
