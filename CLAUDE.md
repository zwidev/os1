# CLAUDE.md — OS1 Voice Agent (ZenCore MARKETPLACE package)

This is **`zwidev/os1`** (locally `D:\agentos1`, default branch `main`) — the marketplace-ready
packaging of the OS1 voice agent, formatted per the ZenCore Agent Developer Guide. **This folder
ships. NEVER put real secrets here** — every key is a `{{PLACEHOLDER}}` filled by the provisioner
at deploy time. Ops notes: `OS1_RUNBOOK.md`.

The OS1 terracotta UI + Three.js "tube" animation here is also the visual origin reused by the
`agent-12-rag-voice` concept (`zwidev/os1agent`).

## What this is
A declarative **stack bundle** that deploys the OS1 voice agent to an **Ubuntu VPS**:
ElevenLabs voice ↔ Claude (fast talk) + OpenClaw worker (background tasks) + Obsidian-backed memory.

## Layout
```
stacks/os1-voice-agent/
  stack.json                 # authoritative component contract (schemaVersion 1)
  install.sh                 # orchestrator (runs components by per-component installOrder 10→60)
  README.md ; catalog-entry.ts
  components/
    agent-gateway/   runtime         (OpenClaw + voice proxy; config.template.json, proxy.js, systemd units)
    primary-llm/     inference-provider (Anthropic Claude; key -> {{PRIMARY_LLM_API_KEY}})
    local-inference/ inference        (Ollama embeddings + optional fallback)
    memory-vault/    data             (builtin memory + memory-wiki Obsidian + Dreaming + 15m refresh timer)
    voice-channel/   integration      (ElevenLabs; register-agent.sh PATCHes custom-llm URL)
    os1-dashboard/   dashboard        (React UI in ui/, built on the VPS)
  agent/{skills,tools}/
```

## Architecture (mirrors the live stack)
- **Talk layer:** `agent-gateway/proxy.js` (env-driven, cross-platform) → Anthropic Claude; has server-side `web_search`; recalls memory by reading `MEMORY.md` + today's daily note.
- **Do layer:** `<<TASK>>…<<END>>` → local OpenClaw gateway (background).
- **Memory:** `memory-vault` runs `openclaw wiki init` + installs `os1-wiki-refresh.timer` (systemd, every 15 min: `memory index → wiki bridge import → wiki compile`).
- Tenant served at `https://<username>.zencore.solutions` (UI at `/`, proxy at `/v1`). Gateway 18789, proxy 18790, Ollama 11434 (all loopback).

## Ship checklist
1. Copy `stacks/os1-voice-agent/` into the **zencore-tenant-templates** repo at `stacks/os1-voice-agent/`.
2. Paste the object in `catalog-entry.ts` into `MARKETPLACE_STACK_LISTINGS` in **zencore** `packages/shared/src/marketplace.ts`.
3. Keep `reviewStatus: "review"`; after admin approval + dev-tenant deploy, set `status: "available"`.
4. IDs must match: catalog `id` ↔ `stack.json` `id` ↔ folder = `os1-voice-agent`.

## Rules / gotchas
- **No secrets, ever** — placeholders only. Run a secret scan before committing.
- This folder root (`CLAUDE.md`, `OS1_RUNBOOK.md`) stays OUT of the zencore repo — only `stacks/os1-voice-agent/` is copied in.
- `install.sh` scripts target **Ubuntu** (apt, NodeSource, systemd, Ollama), run as **root**.
- `install.sh` scripts are **untested on a real VPS** — needs a dev-tenant deploy. **Pin the `openclaw` npm version** before going live.
- This is a **separate copy** of the proxy/memory logic from `D:\myos1` and `D:\ibuildher` — mirror any change made there into here before shipping.

## Working in this repo (agent)
- Components are ordered by the per-component `installOrder` field in `stack.json` (agent-gateway 10, primary-llm 20, local-inference 30, memory-vault 40, voice-channel 50, os1-dashboard 60).
- Validate edits to `stack.json` against the contract (`parseStackDefinition()` in the ZenCore guide) and keep `reviewStatus: "review"` until a dev-tenant deploy passes.
- Develop on your assigned branch; create it from `main` if missing.
