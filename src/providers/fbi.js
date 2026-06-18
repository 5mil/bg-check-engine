const axios = require('axios');

/**
 * FBI Most Wanted API
 * Free, no auth required.
 * Docs: https://api.fbi.gov/
 */
async function search({ firstName, lastName }) {
  const res = await axios.get('https://api.fbi.gov/wanted/v1/list', {
    params: { title: `${firstName} ${lastName}`, pageSize: 10 },
    timeout: 8000,
  });

  const items = res.data.items || [];
  return {
    source: 'FBI Most Wanted',
    count: items.length,
    records: items.map(r => ({
      title: r.title,
      description: r.description?.slice(0, 200),
      status: r.status,
      url: r.url,
      images: r.images?.[0]?.thumb || null,
    })),
  };
}

module.exports = { search };
