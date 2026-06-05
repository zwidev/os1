import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getConfig } from './_config.js';

export async function save_preference({ key, value } = {}) {
  if (!key || value == null) throw new Error('key and value are required');
  const cfg = getConfig();
  let prefs;
  try { prefs = JSON.parse(readFileSync(cfg.prefsFile, 'utf8')); } catch { prefs = {}; }
  prefs[key] = value;
  prefs._updatedAt = new Date().toISOString();
  mkdirSync(dirname(cfg.prefsFile), { recursive: true });
  writeFileSync(cfg.prefsFile, JSON.stringify(prefs, null, 2));
  return { saved: true, key, value };
}

export default save_preference;
