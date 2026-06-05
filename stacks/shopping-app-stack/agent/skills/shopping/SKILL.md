---
name: shopping
description: "Shopping assistant. Use when asked to find, search, compare, buy, or basket products from Tesco, Sainsbury's, Amazon, or eBay. Delegates to the Shopping App agent at http://127.0.0.1:18792."
---

# Shopping Skill

This skill delegates shopping requests to the Shopping App agent running locally. The Shopping App must be installed as a separate stack on this tenant's server.

## When to use

Use this skill when the user asks to:
- Find, search, or look up products (groceries, electronics, clothing, etc.)
- Compare prices across stores
- Add something to the shopping basket
- Check what's in their basket
- Set shopping preferences (dietary requirements, budget, preferred store, brands)

Example triggers: "find oat milk", "compare milk prices", "add wine to basket", "what's in my basket", "I'm vegan, remember that", "best headphones under £50"

## How to call

POST to `http://127.0.0.1:18792/api/chat` with the conversation history:

```json
{
  "messages": [
    { "role": "user", "content": "Find me oat milk under £2" }
  ]
}
```

Response:
```json
{ "role": "assistant", "content": "Here are some options under £2:\n<results>[...]</results>" }
```

No auth token required — the gateway binds to loopback only (port 18792).

## Parsing results

The response content may include `<results>[...]</results>` tags containing a JSON array of products:
```json
[{"name":"Oatly Barista 1L","price":1.80,"store":"tesco","url":"...","image":null}]
```

Present these to the user as a product list.

## Basket and preferences

- Basket items persist on disk and survive restarts
- Preferences (dietary, budget, preferred_store) are also persisted and automatically applied by the shopping agent
- Use `get_basket` (via chat) to read the basket; use the `/api/basket` DELETE endpoint to remove individual items by ID
