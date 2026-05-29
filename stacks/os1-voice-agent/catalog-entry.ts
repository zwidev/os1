// Paste this object into MARKETPLACE_STACK_LISTINGS in:
//   zencore/packages/shared/src/marketplace.ts
// IDs must match: this `id` ↔ stack.json `id` ↔ tenant-templates folder name.
// Keep reviewStatus: "review" until admin approval, then set status: "available".

{
  id: "os1-voice-agent",
  name: "OS1 Voice Agent",
  summary:
    "Real-time voice AI: ElevenLabs voice talks to a local Qwen2.5-14B model for fast, private conversation. An OpenClaw agent handles file/code/system tasks in the background. Persistent Obsidian-backed memory recalls context across sessions. No cloud LLM API key required.",
  stackPath: "stacks/os1-voice-agent",
  componentSummary: [
    "agent-gateway",
    "qwen2.5-14b-llm",
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
  eyebrow: "Voice",
  category: "assistant",
  outcome: "Talk to a private, self-contained AI that actually does things on your server.",
  capabilities: [
    "Natural real-time voice conversation (local Qwen2.5-14B, no API key)",
    "Background file/code/system task execution via OpenClaw",
    "Cross-session memory (Obsidian vault + nightly consolidation)",
    "Fully self-contained — no external LLM dependency",
  ],
  version: "0.2.0",
  firstParty: true,
}
