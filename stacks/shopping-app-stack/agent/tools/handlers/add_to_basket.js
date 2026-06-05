import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getConfig } from './_config.js';

export async function add_to_basket({ name, store, price, url = null, quantity = 1 } = {}) {
  if (!name || !store || price == null) throw new Error('name, store, and price are required');
  const cfg = getConfig();
  const basket = readBasket(cfg.basketFile);
  const id = `item-${Date.now()}`;
  basket.items.push({ id, name, store, price, url, quantity, addedAt: new Date().toISOString() });
  writeBasket(cfg.basketFile, basket);
  const total = basket.items.reduce((s, i) => s + i.price * i.quantity, 0);
  return { success: true, id, item: { name, store, price, quantity }, basketTotal: total, itemCount: basket.items.length };
}

function readBasket(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return { items: [] }; }
}

function writeBasket(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export default add_to_basket;
