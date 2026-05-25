# agentos1 — OS1 Voice Agent, packaged for the ZenCore marketplace

This folder is the **marketplace-ready** version of the OS1 voice stack, formatted per the
ZenCore Agent Developer Guide (component-based stack bundle). It contains **no secrets** —
every key is a `{{PLACEHOLDER}}` filled at provision time.

> The runnable, secret-bearing local copy lives separately in `D:\myos1`. This `agentos1`
> folder is for shipping; never put real keys or private memory here.

## What goes where (two repos)

| This folder | Copy into repo | Path |
|-------------|----------------|------|
| `stacks/os1-voice-agent/` | **zencore-tenant-templates** | `stacks/os1-voice-agent/` |
| `stacks/os1-voice-agent/catalog-entry.ts` | **zencore** | append object to `MARKETPLACE_STACK_LISTINGS` in `packages/shared/src/marketplace.ts` |

**IDs must match:** catalog `id` ↔ `stack.json` `id` ↔ tenant-templates folder = `os1-voice-agent`.

## Layout

```text
stacks/os1-voice-agent/
  stack.json                 # authoritative component contract (schemaVersion 1)
  install.sh                 # orchestrator (runs components in installOrder)
  README.md                  # architecture + deploy
  catalog-entry.ts           # MARKETPLACE_STACK_LISTINGS entry for the zencore repo
  components/
    agent-gateway/           # runtime: OpenClaw + voice proxy (+ config.template.json, proxy.js)
    primary-llm/             # inference-provider: Claude (provider-only)
    local-inference/         # inference: Ollama embeddings + optional fallback
    memory-vault/            # data: builtin memory + memory-wiki Obsidian vault + Dreaming
    voice-channel/           # integration: ElevenLabs agent registration
    os1-dashboard/           # dashboard: OS1 React UI (ui/ source builds on the VPS)
  agent/{skills,tools}/      # optional agent skills/tools
```

## Ship checklist (from the guide §9)

- [ ] Copy `stacks/os1-voice-agent/` into **zencore-tenant-templates**
- [ ] Add `catalog-entry.ts` object to `MARKETPLACE_STACK_LISTINGS` (keep `reviewStatus: "review"`)
- [ ] Confirm `parseStackDefinition()` passes on `stack.json`
- [ ] Verify no secrets committed (placeholders only)
- [ ] Open PR → admin approves → set `status: "available"` after dev-tenant deploy

## Target environment

Ubuntu VPS, provisioner runs as root. Installs Node 20 (NodeSource), `openclaw` (npm),
Ollama (official script), and registers two `systemd` units (`agent-gateway`, `voice-proxy`).
Tenant is served at `https://<username>.zencore.solutions` (dashboard at `/`, proxy at `/v1`).
