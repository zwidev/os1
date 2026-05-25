# OS1 Voice Agent — Runbook

Voice AI that **talks fast** (ElevenLabs ↔ Claude) and **does real work in the background**
(OpenClaw agent + tools), with **persistent memory** (Obsidian-backed).

> No secrets are written in this document. API keys / tokens live only inside the
> start scripts and the OpenClaw state dir on this machine.

---

## 1. Architecture

```text
                 ┌──────────────────────── this machine ────────────────────────┐
  You speak      │                                                               │
  ──► ElevenLabs ├─ HTTPS /v1 ─► voice proxy ──► Anthropic Claude   [talk: 2-4s]  │
      agent      │   (via Cloudflare    │                                         │
                 │    tunnel)           └─ <<TASK>> ─► OpenClaw gateway ─► tools,  │
                 │                                     files   [do: background]   │
                 │                                        │                        │
                 │   recall ◄─ MEMORY.md + today's note ◄──┤ memory (builtin +      │
                 │                                          │ memory-wiki Obsidian) │
  Browser UI ◄───┤  OS1 React UI                            └ Dreaming (nightly)    │
                 └───────────────────────────────────────────────────────────────┘
```

**Why the split:** ElevenLabs caps the LLM reply at ~15s. Conversation via Claude always
answers in time. Real tasks (20–60s+) go to OpenClaw's worker in the background and are
reported on the next voice turn.

---

## 2. Environments

| Folder | Purpose | Gateway | Proxy | UI | OpenClaw state |
|--------|---------|--------:|------:|---:|----------------|
| `D:\ibuildher` | **Live** working stack | 18789 | 18790 | 5173 | `C:\Users\wayne\.openclaw` (shared/global) |
| `D:\myos1` | **Sandbox** (memory experiments, isolated) | 18889 | 18890 | 5174 | `D:\myos1\.openclaw` (isolated) |
| `D:\agentos1` | **ZenCore marketplace** package (ship only, no secrets) | — | — | — | template only |

> Run **one stack at a time** — both point the *same* ElevenLabs agent at their tunnel
> (one agent = one Server URL). To run both at once, duplicate the agent in ElevenLabs.

---

## 3. Start / Stop — LIVE (`D:\ibuildher`)

**Start everything (gateway → proxy → tunnel → ElevenLabs update → UI):**
```powershell
powershell -ExecutionPolicy Bypass -File D:\ibuildher\start-os1.ps1
```

**Stop everything:**
```powershell
powershell -ExecutionPolicy Bypass -File D:\ibuildher\stop-os1.ps1
```

The start script auto-reads the new Cloudflare URL and PATCHes the ElevenLabs agent's
`custom-llm` Server URL to `https://<new-url>/v1`. Opens `http://localhost:5173`.

### Manual (4 separate PowerShell windows), if you ever need it
```powershell
# 1) Gateway
openclaw gateway --port 18789
# 2) Proxy
node D:\ibuildher\proxy.js
# 3) Cloudflare tunnel (copy the trycloudflare URL it prints)
D:\ibuildher\cloudflared.exe tunnel --url http://localhost:18790
# 4) UI
cd D:\ibuildher\her-called-package-v4\os1-interface ; npm run dev
```
Then set the ElevenLabs agent Server URL to `https://<tunnel-url>/v1` (the start script
does this for you automatically).

---

## 4. Start / Stop — SANDBOX (`D:\myos1`)

**One-time, before first run** (UI deps were not copied):
```powershell
cd D:\myos1\os1-interface ; npm install
```

**Start the sandbox** (isolated state dir + ports 18889 / 18890 / 5174):
```powershell
powershell -ExecutionPolicy Bypass -File D:\myos1\start-myos1.ps1
```

**Stop the sandbox:**
```powershell
powershell -ExecutionPolicy Bypass -File D:\myos1\stop-myos1.ps1
```

The sandbox gateway runs with `OPENCLAW_STATE_DIR=D:\myos1\.openclaw`, so its memory and
config are fully separate from the live stack. Telegram is disabled in the sandbox.

---

## 5. Memory system

| Concern | How it works |
|--------|--------------|
| **Recall** | Each turn the proxy injects `MEMORY.md` + today's daily note (`memory\YYYY-MM-DD.md`) into Claude's context. Instant file read (a live CLI semantic search cold-starts ~34s — too slow for voice). |
| **Remember** | "Remember that…" → talking layer emits `<<TASK>>Append this durable fact to MEMORY.md…<<END>>` → OpenClaw worker writes it (background). |
| **Consolidation** | `memory-core` **Dreaming** runs nightly (`0 3 * * *`) and promotes recurring notes into `MEMORY.md`. |
| **Browse** | `memory-wiki` mirrors memory into an Obsidian vault (`<state>\.openclaw\wiki\main`). |
| **Backend** | builtin (SQLite + FTS keyword; vector via the auto-detected embedding provider). |

**Memory file locations**
- Live:    `C:\Users\wayne\.openclaw\workspace\MEMORY.md` + `...\workspace\memory\`
- Sandbox: `D:\myos1\.openclaw\workspace\MEMORY.md` + `...\workspace\memory\`
- Obsidian vault (sandbox): `D:\myos1\.openclaw\wiki\main`

### Obsidian memory wiki (`openclaw wiki`)

The agent's recall uses the plain `MEMORY.md` + daily notes directly. The **`memory-wiki`**
feature is a *separate, richer* Obsidian vault that builds up over time from Dreaming-processed
artifacts. It is built into OpenClaw (commands below); it just has to be initialized.

```powershell
$env:OPENCLAW_STATE_DIR = "D:\myos1\.openclaw"   # sandbox; omit for the live/global state
openclaw wiki status          # vault state + page counts
openclaw wiki doctor          # audit setup
openclaw wiki init            # initialize the vault layout (one-time)
openclaw wiki bridge import   # pull processed memory artifacts into the vault
openclaw wiki compile         # refresh generated indexes/pages
openclaw memory index         # (re)index MEMORY.md + daily notes for search
```

**Two ways to browse memory in Obsidian:**
1. **Live facts now:** open `D:\myos1\.openclaw\workspace` as an Obsidian vault → `MEMORY.md` + daily notes.
2. **Structured wiki:** open `D:\myos1\.openclaw\wiki\main` → grows over time.

**Auto-refresh (sandbox):** `start-myos1.ps1` launches `refresh-wiki.ps1`, which runs
`memory index -> wiki bridge import -> wiki compile` every 15 min so the vault stays current.
`stop-myos1.ps1` stops it. Run it standalone with:
```powershell
powershell -ExecutionPolicy Bypass -File D:\myos1\refresh-wiki.ps1
```

**Auto-refresh (marketplace / Ubuntu):** the `memory-vault` component installs a `systemd`
timer `os1-wiki-refresh.timer` (every 15 min) that runs the same index/bridge/compile cycle.

> The vault fills only once there are processed artifacts to pull. `bridge import` returns
> "0 artifacts" until Dreaming (nightly, 3am) or real sessions produce them — the refresh
> keeps the vault current the moment there *is* something, it doesn't manufacture content early.
> Optional: the official **Obsidian CLI** (for `openclaw wiki obsidian` helpers) is not installed by default.

**Test the loop (by voice)**
1. "Remember that I drive a Rolls-Royce." → "Got it, I'll remember that." (proxy window shows `[worker] dispatching`).
2. End the conversation, start a new one, ask "What car do I drive?" → answered from memory.
3. Watch the proxy window for `[recall] injected N chars of memory` each turn.

---

## 6. ElevenLabs

- **Agent ID:** `agent_3101ksb1zwbzfd9a5x3a9qf5ccb6`
- **Voice ID:** `JSWO6cw2AyFE324d5kEr`
- **Server URL:** set automatically by the start script to `https://<tunnel>/v1`.
- The LLM type must be **`custom-llm`** and the URL must end in **`/v1`** (ElevenLabs appends `/chat/completions`).
- Cap is ~15s to first response — the whole reason for the talk/do split.

Manually re-point the agent (PowerShell), if needed:
```powershell
$key = "<ELEVENLABS_API_KEY>"   # not stored in this doc
Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/agent_3101ksb1zwbzfd9a5x3a9qf5ccb6" -Method PATCH `
  -Headers @{ "xi-api-key" = $key; "Content-Type" = "application/json" } `
  -Body '{"conversation_config":{"agent":{"prompt":{"llm":"custom-llm","custom_llm":{"url":"https://<tunnel>/v1"}}}}}'
```

---

## 7. Key files

| File | Role |
|------|------|
| `D:\ibuildher\proxy.js` | Live voice proxy (talk + do + memory recall) |
| `D:\ibuildher\start-os1.ps1` / `stop-os1.ps1` | Live start/stop |
| `D:\ibuildher\task-status.json` | Background task tracker |
| `C:\Users\wayne\.openclaw\openclaw.json` | Live OpenClaw config |
| `D:\myos1\proxy.js` | Sandbox proxy (ports 18890/18889, memory recall) |
| `D:\myos1\start-myos1.ps1` / `stop-myos1.ps1` | Sandbox start/stop |
| `D:\myos1\.openclaw\openclaw.json` | Sandbox config (memory plugins enabled) |
| `D:\agentos1\stacks\os1-voice-agent\` | ZenCore marketplace stack |

---

## 8. ZenCore marketplace package (`D:\agentos1`)

Structured per the ZenCore Agent Developer Guide. **No secrets — all `{{PLACEHOLDERS}}`.**

Components: `agent-gateway` (runtime), `primary-llm` (Anthropic provider), `local-inference`
(Ollama embeddings, optional), `memory-vault` (data), `voice-channel` (ElevenLabs), `os1-dashboard` (UI).

**To ship:**
1. Copy `D:\agentos1\stacks\os1-voice-agent\` into the **zencore-tenant-templates** repo at `stacks/os1-voice-agent/`.
2. Paste the object from `catalog-entry.ts` into `MARKETPLACE_STACK_LISTINGS` in **zencore** `packages/shared/src/marketplace.ts`.
3. Keep `reviewStatus: "review"`; after admin approval + dev-tenant deploy, set `status: "available"`.

Target host: **Ubuntu VPS**, provisioner runs as root. Installs Node 20, `openclaw`, Ollama;
registers `systemd` units `agent-gateway` + `voice-proxy`. Tenant served at
`https://<username>.zencore.solutions` (UI at `/`, proxy at `/v1`).

> `myos1` (Windows) and `agentos1` (Ubuntu) are **separate copies**. Mirror any proxy/memory
> change into both before shipping.

---

## 9. Troubleshooting (issues hit + fixes)

| Symptom | Cause | Fix |
|---------|-------|-----|
| ElevenLabs "LLM Cascade Error" | Response slower than ~15s | Talk/do split; proxy answers via Claude fast |
| Tunnel URL "could not be resolved" | `cloudflared` stopped (new URL each run) | Restart tunnel; start script re-PATCHes ElevenLabs |
| Responses degraded to 29–88s | Stale OpenClaw sessions piling up | Avoided entirely by talk-layer = Claude direct |
| "Files not on my desktop" | OneDrive-redirected Desktop (`D:\theonedrive\OneDrive\Desktop`) | Proxy injects real Desktop/Documents paths to the worker |
| Same task ran many times | Conversation history re-triggered `<<TASK>>` each turn | Dedup guard + in-progress list in the system prompt |
| `.ps1` "string is missing the terminator" | em-dash in a quoted string (ANSI read) | Use plain ASCII hyphens in scripts |
| `openclaw memory search` ~34s | CLI cold-starts a process each call | Recall reads `MEMORY.md` + daily note directly instead |

---

## 10. Quick reference

```powershell
# LIVE
powershell -ExecutionPolicy Bypass -File D:\ibuildher\start-os1.ps1
powershell -ExecutionPolicy Bypass -File D:\ibuildher\stop-os1.ps1

# SANDBOX (first run: cd D:\myos1\os1-interface ; npm install)
powershell -ExecutionPolicy Bypass -File D:\myos1\start-myos1.ps1
powershell -ExecutionPolicy Bypass -File D:\myos1\stop-myos1.ps1
```
