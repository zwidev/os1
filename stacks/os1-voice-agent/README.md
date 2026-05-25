# OS1 Voice Agent — ZenCore Stack

Real-time voice AI. ElevenLabs voice talks to **Claude** for fast, natural conversation; an **OpenClaw** agent performs file/code/system tasks in the background; **Obsidian-backed memory** recalls context across sessions.

## Architecture

```text
                 ┌─────────────────────────── tenant VPS (Ubuntu) ───────────────────────────┐
  Caller speaks  │                                                                            │
  ──► ElevenLabs ├─ HTTPS /v1 ─► voice-proxy (18790) ──► Anthropic Claude   [talking layer]   │
      agent      │                    │                                                       │
                 │                    └─ <<TASK>> ─► OpenClaw gateway (18789) ─► tools, files  │
                 │                                        │           [doing layer, async]     │
                 │                                        ├─ memory: builtin + memory-wiki      │
                 │                                        │          (Obsidian vault)           │
                 │                                        └─ embeddings ─► Ollama (11434)        │
  Browser UI ◄───┤  os1-dashboard (static, tenant root "/")                                    │
                 └────────────────────────────────────────────────────────────────────────────┘
```

**Why the split:** ElevenLabs caps the LLM response at ~15s. Conversation via Claude is fast and always replies in time. Real tasks (which can take 20–60s+) are handed to OpenClaw's worker in the background and reported back on the next voice turn.

## Components (installOrder)

| Order | ID | Type | Role |
|------:|----|------|------|
| 10 | `agent-gateway` | runtime | OpenClaw gateway + voice proxy (systemd) |
| 20 | `primary-llm` | inference-provider | Claude via Anthropic API |
| 30 | `local-inference` | inference | Ollama embeddings (semantic memory) + optional fallback |
| 40 | `memory-vault` | data | builtin memory backend + memory-wiki Obsidian vault + Dreaming |
| 50 | `voice-channel` | integration | registers ElevenLabs agent → tenant `/v1` |
| 60 | `os1-dashboard` | dashboard | OS1 React UI |

## Required credentials

| ID | Used for |
|----|----------|
| `primary_llm_api_key` | Anthropic (Claude) |
| `elevenlabs_api_key` | ElevenLabs synthesis + agent config |
| `elevenlabs_agent_id` | the tenant's ElevenLabs agent |

## Ports

`18789` OpenClaw gateway (loopback) · `18790` voice proxy (loopback) · `11434` Ollama (loopback). The base reverse proxy exposes the dashboard at `/` and the proxy at `/v1`.

## Deploy

Provisioner reads `stack.json` and runs each component's `install.sh` in `installOrder`. Manual/dev-tenant equivalent:

```bash
sudo PRIMARY_LLM_API_KEY=... ELEVENLABS_API_KEY=... ELEVENLABS_AGENT_ID=... \
     TENANT_PUBLIC_URL=https://<username>.zencore.solutions \
     bash stacks/os1-voice-agent/install.sh
```

Health: `curl -s http://127.0.0.1:18790/health` → `{"status":"ok"}`.

## Security / export policy

- **No secrets in this repo.** All keys are placeholders filled at provision time.
- `exportPolicy`: `excludeSecrets`, `excludePrivateMemory`, `excludeCustomerData`.
- Private memory (`MEMORY.md`, daily notes, the Obsidian vault) is tenant data and is never exported.
- Browser bundle contains only the public ElevenLabs Agent ID; the ElevenLabs API key never reaches the client.
