# Shopping App

Autonomous shopping assistant for ZenCore tenants. Claude searches Tesco, Sainsbury's, Amazon, and eBay, compares prices, manages a persistent basket, and remembers user preferences.

## Architecture

- **agent-gateway** (port 18792): Node.js HTTP server. Handles `/api/chat` (Claude tool-use loop), `/api/basket`, `/api/preferences`, and serves the React UI as static files.
- **primary-llm**: Writes the Anthropic API key into `/opt/shopping-app/.env` and restarts the gateway.
- **shopping-dashboard**: Builds the React UI on the VPS (`npm run build`) and copies the bundle to `/opt/shopping-app/dashboard`.

## Tools

| Tool | Description |
|------|-------------|
| `search_store` | Search Tesco, Sainsbury's, Amazon, or eBay for products (mock data — wire up Playwright per store) |
| `compare_prices` | Compare prices across multiple stores |
| `add_to_basket` | Add an item to the basket (persists to `/opt/shopping-app/data/basket.json`) |
| `get_basket` | Read basket contents, grouped by retailer with subtotals |
| `save_preference` | Save dietary requirements, budget limits, preferred stores, or brands |

## OS1 Integration

The `agent/skills/shopping/SKILL.md` skill tells OS1's orchestrator to delegate shopping requests to `http://127.0.0.1:18792/api/chat`. OS1 can say "add milk to my basket" and the shopping agent handles it.

## Data

- `/opt/shopping-app/data/basket.json` — basket state (persists across restarts)
- `/opt/shopping-app/data/prefs.json` — user preferences
- `/opt/shopping-app/dashboard/` — built React bundle

## Next Steps

1. Replace `search_store` and `compare_prices` mock responses with Playwright automation per store
2. Connect the UK Grocery CLI for Tesco / Sainsbury's live inventory
3. Add session/cookie import for authenticated checkout flows
4. Pin `@anthropic-ai/sdk` npm version before going to production
