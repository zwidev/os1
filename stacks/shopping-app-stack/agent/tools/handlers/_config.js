import { readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.DATA_DIR || '/opt/shopping-app/data';

export function getConfig() {
  return {
    dataDir: DATA_DIR,
    basketFile: join(DATA_DIR, 'basket.json'),
    prefsFile:  join(DATA_DIR, 'prefs.json'),
  };
}
