// search_store — standalone handler for use outside the gateway (e.g. OpenClaw).
// The gateway (server.js) has an inline equivalent with the same mock catalog.
// TODO: Replace mockSearch with per-store Playwright automation.

export async function search_store({ query = '', store = 'all', max_price } = {}) {
  const results = mockSearch(query, store, max_price);
  return { results, count: results.length, query, store };
}

function mockSearch(query, store, maxPrice) {
  const q = query.toLowerCase();
  const all = getSampleProducts();
  let matches = all.filter(p => p.name.toLowerCase().includes(q.split(' ')[0]) || q.includes(p._keywords));
  if (!matches.length) matches = all.slice(0, 4);
  return matches
    .filter(p => store === 'all' || p.store === store)
    .filter(p => !maxPrice || p.price <= maxPrice)
    .map(({ _keywords, ...p }) => p)
    .slice(0, 8);
}

function getSampleProducts() {
  return [
    { _keywords: 'milk', name: 'Tesco Semi-Skimmed Milk 2L',          price: 1.45, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-semi-skimmed-milk-2l' },
    { _keywords: 'milk', name: "Sainsbury's Whole Milk 2L",            price: 1.60, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/sainsburys-whole-milk-2l' },
    { _keywords: 'milk', name: 'Oatly Oat Milk Barista 1L',           price: 1.80, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/oatly-oat-milk-barista' },
    { _keywords: 'bread', name: 'Warburtons Thick Sliced 800g',        price: 1.50, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/warburtons-thick-sliced-white' },
    { _keywords: 'wine', name: 'Tesco Finest Malbec 75cl',             price: 8.00, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-finest-malbec' },
    { _keywords: 'headphones', name: 'Sony WH-1000XM5',               price: 279.00, store: 'amazon',   url: 'https://www.amazon.co.uk/dp/B09XS7JWHH' },
    { _keywords: 'headphones', name: 'JBL Tune 510BT',                price: 29.99, store: 'amazon',    url: 'https://www.amazon.co.uk/dp/B08WM5S1F6' },
  ];
}

export default search_store;
