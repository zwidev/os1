'use strict';
// Shopping App Gateway
// GET  /health              → {"status":"ok"}
// POST /api/chat            → Claude chat with shopping tool-use loop
// GET  /api/basket          → basket contents grouped by store
// DELETE /api/basket/:id   → remove basket item
// GET  /api/preferences    → user preferences
// POST /api/preferences    → merge-save preferences
// GET  /*                  → serve React UI (SPA fallback to index.html)

const http = require('http');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const PORT = parseInt(process.env.SHOPPING_PORT || '18792', 10);
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, 'dashboard');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const GROC_API_URL = process.env.GROC_API_URL || 'http://127.0.0.1:7876';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

// ── Persistence ────────────────────────────────────────────────────────────────

function readJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return def; }
}
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const BASKET_FILE = path.join(DATA_DIR, 'basket.json');
const PREFS_FILE  = path.join(DATA_DIR, 'prefs.json');

function readBasket() { return readJSON(BASKET_FILE, { items: [] }); }
function writeBasket(b) { writeJSON(BASKET_FILE, b); }
function readPrefs()  { return readJSON(PREFS_FILE, {}); }
function writePrefs(p) { writeJSON(PREFS_FILE, p); }

// ── Live search via uk-grocery-cli groc-api ────────────────────────────────────
// Calls the groc-api sidecar on port 7876 for tesco and sainsburys.
// Falls back to mock data if groc-api is not running.

const GROC_STORE_MAP = { tesco: 'tesco', sainsburys: 'sainsburys' };

function grocApiSearch(query, provider, limit) {
  return new Promise((resolve, reject) => {
    const url = `${GROC_API_URL}/search?q=${encodeURIComponent(query)}&provider=${encodeURIComponent(provider)}&limit=${limit}`;
    http.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) { reject(new Error(parsed.error)); return; }
          resolve((parsed.products || []).map(p => ({
            name: p.name,
            price: p.retail_price?.price || 0,
            store: p.provider || provider,
            url: null,
            image: p.image_url || null,
          })));
        } catch (e) { reject(e); }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('groc-api timeout')));
  });
}

async function liveSearch(query, store, limit) {
  const provider = GROC_STORE_MAP[store];
  if (!provider) return null; // caller should fall back to mock for amazon/ebay
  try {
    return await grocApiSearch(query, provider, limit);
  } catch (e) {
    console.warn(`[groc-api] ${store} search failed (${e.message}) — using mock data`);
    return null;
  }
}

// ── Mock product catalog ───────────────────────────────────────────────────────
// Fallback for amazon/ebay and when groc-api is not running.
//       Tesco/Sainsbury's: use UK Grocery CLI or Playwright with cookie import.
//       Amazon: use the Product Advertising API or Playwright.
//       eBay: use the Browse API (OAuth).

const MOCK_CATALOG = {
  milk: [
    { name: 'Tesco Organic Whole Milk 2L',       price: 1.85, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-organic-whole-milk-2l' },
    { name: 'Tesco Semi-Skimmed Milk 2L',         price: 1.45, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-semi-skimmed-milk-2l' },
    { name: "Sainsbury's Organic Whole Milk 2L",  price: 1.90, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/sainsburys-organic-whole-milk-2l' },
    { name: "Sainsbury's Semi-Skimmed Milk 2L",   price: 1.50, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/sainsburys-semi-skimmed-milk-2l' },
    { name: 'Oatly Oat Milk Barista Edition 1L',  price: 1.80, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/oatly-oat-milk-barista' },
    { name: 'Alpro Oat No Sugars Oat Milk 1L',   price: 1.50, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/alpro-oat-milk-1l' },
    { name: 'Minor Figures Oat M*lk Barista 1L',  price: 2.10, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/minor-figures-oat-milk' },
    { name: 'Tesco Plant Chef Oat Drink 1L',      price: 0.90, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-plant-chef-oat-drink' },
  ],
  bread: [
    { name: 'Warburtons Thick Sliced White 800g',      price: 1.50, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/warburtons-thick-sliced-white' },
    { name: 'Hovis Wholemeal Medium Sliced 800g',       price: 1.30, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/hovis-wholemeal' },
    { name: "Sainsbury's Sourdough Loaf 400g",          price: 1.95, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/sainsburys-sourdough' },
    { name: "Sainsbury's Taste the Difference Seeded",  price: 2.25, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/taste-the-difference-seeded-bread' },
  ],
  coffee: [
    { name: 'Nescafé Gold Original 200g',                          price: 4.50, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/nescafe-gold-original-200g' },
    { name: 'Taylors of Harrogate Rich Italian Ground Coffee 227g', price: 4.00, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/taylors-rich-italian' },
    { name: 'Lavazza Qualità Rossa Ground Coffee 1kg',              price: 12.00, store: 'amazon',    url: 'https://www.amazon.co.uk/dp/B004SGBW20' },
    { name: 'Illy Classico Ground Coffee 250g',                    price: 9.00, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/illy-classico-ground-coffee' },
  ],
  wine: [
    { name: 'Tesco Finest Argentinian Malbec 75cl',                price: 8.00, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-finest-malbec' },
    { name: 'Blossom Hill Red Wine 75cl',                           price: 6.50, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/blossom-hill-red' },
    { name: "Sainsbury's Taste the Difference Rioja Reserva 75cl", price: 9.00, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/taste-the-difference-rioja' },
    { name: 'Casillero del Diablo Cabernet Sauvignon 75cl',         price: 7.00, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/casillero-del-diablo-cab-sauv' },
  ],
  cheese: [
    { name: 'Tesco Mature Cheddar 400g',                            price: 2.80, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-mature-cheddar-400g' },
    { name: 'Président Brie 200g',                                  price: 2.50, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/president-brie-200g' },
    { name: "Sainsbury's Taste the Difference Parmesan 100g",       price: 2.75, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/taste-the-difference-parmesan' },
    { name: 'Cathedral City Mature Cheddar 350g',                   price: 3.25, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/cathedral-city-mature-cheddar' },
  ],
  chicken: [
    { name: 'Tesco Free Range Whole Chicken 1.5kg',          price: 6.50, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-free-range-whole-chicken' },
    { name: "Sainsbury's British Chicken Breast Fillets 600g", price: 5.25, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/sainsburys-british-chicken-breast-600g' },
    { name: 'Tesco Chicken Thighs Bone-In 1kg',               price: 3.50, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-chicken-thighs-bone-in' },
  ],
  headphones: [
    { name: 'Sony WH-1000XM5 Wireless Noise Cancelling',      price: 279.00, store: 'amazon', url: 'https://www.amazon.co.uk/dp/B09XS7JWHH' },
    { name: 'Apple AirPods Pro 2nd Generation',                price: 229.00, store: 'amazon', url: 'https://www.amazon.co.uk/dp/B0BDHWDR12' },
    { name: 'JBL Tune 510BT Wireless On-Ear',                  price: 29.99,  store: 'amazon', url: 'https://www.amazon.co.uk/dp/B08WM5S1F6' },
    { name: 'Bose QuietComfort 45 Wireless',                   price: 199.00, store: 'amazon', url: 'https://www.amazon.co.uk/dp/B098FKXT8L' },
    { name: 'Sony WH-1000XM4 Wireless (Refurbished)',          price: 149.99, store: 'ebay',   url: 'https://www.ebay.co.uk/sch/i.html?_nkw=sony+wh-1000xm4' },
  ],
  laptop: [
    { name: 'Apple MacBook Air M3 13-inch 8GB/256GB',         price: 1099.00, store: 'amazon', url: 'https://www.amazon.co.uk/dp/B0CWDP5RQ7' },
    { name: 'Lenovo IdeaPad Slim 3 15.6" Laptop',             price: 399.00,  store: 'amazon', url: 'https://www.amazon.co.uk/dp/B0C8B4N3KQ' },
    { name: 'Dell Inspiron 15 3000 Refurbished i5',           price: 249.99,  store: 'ebay',   url: 'https://www.ebay.co.uk/sch/i.html?_nkw=dell+inspiron+15+refurbished' },
  ],
  eggs: [
    { name: 'Tesco Free Range 6 Large Eggs',       price: 1.89, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-free-range-6-large-eggs' },
    { name: "Sainsbury's Free Range 6 Medium Eggs", price: 1.75, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/sainsburys-free-range-6-medium-eggs' },
    { name: 'Clarence Court Burford Brown 6 Large', price: 3.50, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/clarence-court-burford-brown-6-large' },
  ],
  pasta: [
    { name: 'Barilla Spaghetti No.5 500g',        price: 1.25, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/barilla-spaghetti-no5' },
    { name: 'De Cecco Penne Rigate 500g',          price: 1.65, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/de-cecco-penne-rigate' },
    { name: 'Tesco Wholewheat Fusilli 500g',       price: 0.85, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/tesco-wholewheat-fusilli' },
  ],
  olive: [
    { name: 'Filippo Berio Extra Virgin Olive Oil 500ml',    price: 4.50, store: 'tesco',      url: 'https://www.tesco.com/groceries/en-GB/products/filippo-berio-evoo-500ml' },
    { name: "Sainsbury's Taste the Difference EVOO 500ml",   price: 4.00, store: 'sainsburys', url: 'https://www.sainsburys.co.uk/gol-ui/product/taste-the-difference-evoo-500ml' },
  ],
};

function mockSearch(query, store, maxPrice) {
  const q = (query || '').toLowerCase();
  let results = [];

  for (const [keyword, products] of Object.entries(MOCK_CATALOG)) {
    if (q.includes(keyword) || products.some(p => p.name.toLowerCase().includes(q.split(' ')[0]))) {
      results = results.concat(products);
    }
  }

  if (!results.length) {
    // Generic fallback so Claude always gets something back
    const s = store === 'all' ? 'tesco' : store;
    results = [
      { name: `${query} — Standard`, price: 2.99, store: s, url: null },
      { name: `${query} — Premium`,  price: 4.99, store: s === 'tesco' ? 'sainsburys' : 'tesco', url: null },
    ];
  }

  return results
    .filter(p => store === 'all' || p.store === store)
    .filter(p => !maxPrice || p.price <= maxPrice)
    .slice(0, 8);
}

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'search_store',
    description: 'Search a retailer for products matching the query. Returns a list with name, price, store, and URL. Always search before discussing specific products — never invent products.',
    input_schema: {
      type: 'object',
      required: ['query'],
      properties: {
        query:     { type: 'string', description: 'Search terms, e.g. "organic oat milk" or "wireless headphones"' },
        store:     { type: 'string', enum: ['tesco', 'sainsburys', 'amazon', 'ebay', 'all'], description: 'Retailer to search. Use "all" for everything. Default: pick based on category.' },
        max_price: { type: 'number', description: 'Maximum price in GBP' },
        category:  { type: 'string', description: 'Category hint: groceries, electronics, clothing, books, etc.' },
      },
    },
  },
  {
    name: 'add_to_basket',
    description: 'Add a product to the shopping basket. Use when the user confirms they want to buy or add an item.',
    input_schema: {
      type: 'object',
      required: ['name', 'store', 'price'],
      properties: {
        name:     { type: 'string' },
        store:    { type: 'string', enum: ['tesco', 'sainsburys', 'amazon', 'ebay'] },
        price:    { type: 'number', description: 'Price in GBP' },
        url:      { type: 'string', description: 'Product URL from search results' },
        quantity: { type: 'number', default: 1 },
      },
    },
  },
  {
    name: 'compare_prices',
    description: 'Compare prices for a product across multiple retailers side-by-side. Use when the user asks to compare or wants the best price.',
    input_schema: {
      type: 'object',
      required: ['query'],
      properties: {
        query:  { type: 'string', description: 'Product to compare, e.g. "semi-skimmed milk 2L"' },
        stores: { type: 'array', items: { type: 'string', enum: ['tesco', 'sainsburys', 'amazon', 'ebay'] }, description: 'Stores to compare. Defaults to tesco + sainsburys.' },
      },
    },
  },
  {
    name: 'get_basket',
    description: 'Get the current contents of the shopping basket. Returns items grouped by retailer with subtotals and a grand total.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'save_preference',
    description: 'Remember a user preference for this and future sessions. Use for dietary requirements, budget limits, preferred stores, or brands.',
    input_schema: {
      type: 'object',
      required: ['key', 'value'],
      properties: {
        key:   { type: 'string', description: 'Preference name: dietary, budget_max, preferred_store, brand, or any custom key' },
        value: { type: 'string', description: 'Preference value, e.g. "vegan", "£20", "tesco", "Oatly"' },
      },
    },
  },
];

// ── Tool executor ──────────────────────────────────────────────────────────────

async function executeTool(name, input) {
  if (name === 'search_store') {
    const { query = '', store = 'all', max_price } = input;
    const storesToSearch = store === 'all' ? ['tesco', 'sainsburys', 'amazon', 'ebay'] : [store];
    const results = [];
    for (const s of storesToSearch) {
      const live = await liveSearch(query, s, 8);
      results.push(...(live !== null ? live : mockSearch(query, s, null)));
    }
    const filtered = results.filter(p => !max_price || p.price <= max_price).slice(0, 12);
    return { results: filtered, count: filtered.length, query, store };
  }

  if (name === 'compare_prices') {
    const { query = '', stores = ['tesco', 'sainsburys'] } = input;
    const results = [];
    for (const s of stores) {
      const live = await liveSearch(query, s, 6);
      results.push(...(live !== null ? live : mockSearch(query, s, null)));
    }
    return { results: results.sort((a, b) => a.price - b.price), query, stores };
  }

  if (name === 'add_to_basket') {
    const { name: productName, store, price, url = null, quantity = 1 } = input;
    const basket = readBasket();
    const id = `item-${Date.now()}`;
    basket.items.push({ id, name: productName, store, price, url, quantity, addedAt: new Date().toISOString() });
    writeBasket(basket);
    const total = basket.items.reduce((s, i) => s + i.price * i.quantity, 0);
    return { success: true, id, item: { name: productName, store, price, quantity }, basketTotal: total, itemCount: basket.items.length };
  }

  if (name === 'get_basket') {
    const basket = readBasket();
    const byStore = {};
    for (const item of basket.items) {
      byStore[item.store] = byStore[item.store] || { items: [], subtotal: 0 };
      byStore[item.store].items.push(item);
      byStore[item.store].subtotal += item.price * item.quantity;
    }
    const total = basket.items.reduce((s, i) => s + i.price * i.quantity, 0);
    return { items: basket.items, byStore, total, itemCount: basket.items.length };
  }

  if (name === 'save_preference') {
    const { key, value } = input;
    const prefs = { ...readPrefs(), [key]: value, _updatedAt: new Date().toISOString() };
    writePrefs(prefs);
    return { saved: true, key, value };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ShopBot, a personal shopping assistant. You help UK shoppers find, compare, and buy products from Tesco, Sainsbury's, Amazon, and eBay.

MODES — use naturally based on what the user asks:
• BROWSE: Use search_store to find products. Always search first; never invent product names, prices, or URLs.
• COMPARE: Use compare_prices to show prices from multiple stores side-by-side.
• BUY: Use add_to_basket when the user confirms they want something. Confirm each addition aloud ("Added Oatly Barista 1L from Tesco to your basket. £1.80.").
• RECALL: Use get_basket to show basket contents. Use save_preference to remember dietary requirements, budget limits, preferred stores, or brands.

CRITICAL — format search and compare results as JSON inside <results> tags so they render as product cards in the UI:
<results>[{"name":"Oatly Oat Milk Barista Edition 1L","price":1.80,"store":"tesco","url":"https://www.tesco.com/...","image":null}]</results>
Only wrap product listings in <results> — not basket summaries or general replies.

STORE GUIDANCE:
• Groceries (dairy, bread, produce, drinks, meat) → tesco or sainsburys first
• Electronics, tech, books → amazon first
• Second-hand, collectibles, vintage → ebay first
• When unsure → store: "all"

STYLE:
• Prices in £X.XX format
• One short sentence before showing results
• On first message, check for saved preferences (dietary, budget, preferred_store) and honour them
• Proactively ask about dietary requirements or budget if the user seems to be buying food and you don't know their preferences yet
• Be concise and practical`;

// ── Claude chat with tool-use loop ─────────────────────────────────────────────

async function chatWithTools(messages) {
  const loopMessages = messages.map(m => ({ role: m.role, content: m.content }));

  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: loopMessages,
    });

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];
      for (const tu of toolUseBlocks) {
        let content;
        try {
          const result = await executeTool(tu.name, tu.input);
          content = JSON.stringify(result);
        } catch (e) {
          content = JSON.stringify({ error: e.message });
        }
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content });
      }
      loopMessages.push({ role: 'assistant', content: response.content });
      loopMessages.push({ role: 'user', content: toolResults });
    } else {
      return (response.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    }
  }
  return 'I ran into an issue completing that request. Please try again.';
}

// ── Static file server ─────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.webp': 'image/webp',
};

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  let filePath = path.join(STATIC_DIR, urlPath);
  if (!fs.existsSync(filePath)) filePath = path.join(STATIC_DIR, 'index.html');
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

// ── HTTP server ────────────────────────────────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => buf += c);
    req.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  // Health
  if (method === 'GET' && url === '/health') {
    json(res, 200, { status: 'ok', model: ANTHROPIC_MODEL, apiKey: !!process.env.ANTHROPIC_API_KEY, grocApi: GROC_API_URL });
    return;
  }

  // Chat
  if (method === 'POST' && url === '/api/chat') {
    try {
      const body = await readBody(req);
      if (!Array.isArray(body.messages) || !body.messages.length) {
        json(res, 400, { error: 'messages array required' }); return;
      }
      const reply = await chatWithTools(body.messages);
      json(res, 200, { role: 'assistant', content: reply });
    } catch (e) {
      console.error('[/api/chat]', e.message);
      json(res, 500, { error: e.message });
    }
    return;
  }

  // Basket — GET
  if (method === 'GET' && url === '/api/basket') {
    const basket = readBasket();
    const byStore = {};
    for (const item of basket.items) {
      byStore[item.store] = byStore[item.store] || { items: [], subtotal: 0 };
      byStore[item.store].items.push(item);
      byStore[item.store].subtotal += item.price * item.quantity;
    }
    json(res, 200, { items: basket.items, byStore, total: basket.items.reduce((s, i) => s + i.price * i.quantity, 0) });
    return;
  }

  // Basket — DELETE item
  if (method === 'DELETE' && url.startsWith('/api/basket/')) {
    const id = url.slice('/api/basket/'.length);
    const basket = readBasket();
    basket.items = basket.items.filter(i => i.id !== id);
    writeBasket(basket);
    json(res, 200, { success: true });
    return;
  }

  // Preferences — GET
  if (method === 'GET' && url === '/api/preferences') {
    json(res, 200, readPrefs());
    return;
  }

  // Preferences — POST (merge-save)
  if (method === 'POST' && url === '/api/preferences') {
    try {
      const body = await readBody(req);
      const prefs = { ...readPrefs(), ...body, _updatedAt: new Date().toISOString() };
      writePrefs(prefs);
      json(res, 200, prefs);
    } catch {
      json(res, 400, { error: 'Invalid JSON' });
    }
    return;
  }

  // React UI (SPA)
  if (method === 'GET') { serveStatic(req, res); return; }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Shopping Gateway: http://127.0.0.1:${PORT}`);
  console.log(`Model: ${ANTHROPIC_MODEL} | API key: ${process.env.ANTHROPIC_API_KEY ? 'loaded' : 'MISSING - set ANTHROPIC_API_KEY'}`);
  console.log(`Static: ${STATIC_DIR} | Data: ${DATA_DIR}`);
});
