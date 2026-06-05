import { readFileSync } from 'fs';
import { getConfig } from './_config.js';

export async function get_basket() {
  const cfg = getConfig();
  let basket;
  try { basket = JSON.parse(readFileSync(cfg.basketFile, 'utf8')); }
  catch { basket = { items: [] }; }

  const byStore = {};
  for (const item of basket.items) {
    byStore[item.store] = byStore[item.store] || { items: [], subtotal: 0 };
    byStore[item.store].items.push(item);
    byStore[item.store].subtotal += item.price * item.quantity;
  }
  const total = basket.items.reduce((s, i) => s + i.price * i.quantity, 0);
  return { items: basket.items, byStore, total, itemCount: basket.items.length };
}

export default get_basket;
