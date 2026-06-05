// compare_prices — standalone handler. Calls search_store for each requested store.
// TODO: Replace with live per-store Playwright automation.

import { search_store } from './search_store.js';

export async function compare_prices({ query = '', stores = ['tesco', 'sainsburys'] } = {}) {
  const results = [];
  for (const s of stores) {
    const { results: hits } = await search_store({ query, store: s });
    results.push(...hits);
  }
  return { results: results.sort((a, b) => a.price - b.price), query, stores };
}

export default compare_prices;
