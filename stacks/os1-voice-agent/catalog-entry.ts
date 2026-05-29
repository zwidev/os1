// Paste this object into MARKETPLACE_STACK_LISTINGS in:
//   zencore/packages/shared/src/marketplace.ts
// IDs must match: this `id` ↔ stack.json `id` ↔ tenant-templates folder name.
// Keep reviewStatus: "review" until admin approval, then set status: "available".

{
  id: "os1-voice-agent",
  name: "OS1 Voice Agent",
  summary:
    "Real-time voice AI: ElevenLabs voice talks to a local Qwen2.5-14B model by default — no cloud LLM API key required. Optionally upgrades to Claude Sonnet by supplying an Anthropic key at setup. OpenClaw handles background tasks. Persistent Obsidian-backed memory with nightly consolidation.",
  stackPath: "stacks/os1-voice-agent",
  componentSummary: [
    "agent-gateway",
    "qwen2.5-14b-llm",
    "claude-sonnet-optional",
    "ollama-embeddings",
    "obsidian-memory",
    "elevenlabs-voice",
    "os1-ui",
  ],
  packagingMode: "stack",
  deploymentProfile: "openclaw-qwen-elevenlabs-obsidian",
  reviewStatus: "review",
  status: "coming_soon",
  priceModel: { type: "subscription" },
  requiredCredentials: [
    "elevenlabs_api_key",
    "elevenlabs_agent_id",
  ],
  optionalCredentials: [
    "primary_llm_api_key",
  ],
  eyebrow: "Voice",
  category: "assistant",
  outcome: "Private, self-contained voice AI — local Qwen by default, Claude Sonnet if you bring a key.",
  capabilities: [
    "Real-time voice conversation (local Qwen2.5-14B, no API key required)",
    "Optional Claude Sonnet upgrade — supply Anthropic key at setup",
    "Background file/code/system task execution via OpenClaw",
    "Cross-session Obsidian memory with nightly dreaming",
  ],
  version: "0.2.0",
  firstParty: true,
}
