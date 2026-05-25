// Paste this object into MARKETPLACE_STACK_LISTINGS in:
//   zencore/packages/shared/src/marketplace.ts
// IDs must match: this `id` ↔ stack.json `id` ↔ tenant-templates folder name.
// Keep reviewStatus: "review" until admin approval, then set status: "available".

{
  id: "os1-voice-agent",
  name: "OS1 Voice Agent",
  summary:
    "Real-time voice AI: ElevenLabs voice talks to Claude for fast conversation, an OpenClaw agent does file/code/system tasks in the background, with persistent Obsidian-backed memory.",
  stackPath: "stacks/os1-voice-agent",
  componentSummary: [
    "agent-gateway",
    "claude-llm",
    "ollama-embeddings",
    "obsidian-memory",
    "elevenlabs-voice",
    "os1-ui",
  ],
  packagingMode: "stack",
  deploymentProfile: "openclaw-claude-elevenlabs-obsidian",
  reviewStatus: "review",
  status: "coming_soon",
  priceModel: { type: "subscription" }, // adjust to your AddonPriceModel shape
  requiredCredentials: [
    "primary_llm_api_key",
    "elevenlabs_api_key",
    "elevenlabs_agent_id",
  ],
  // optional UI fields supported by MarketplaceStackListing:
  eyebrow: "Voice",
  category: "assistant",
  outcome: "Talk to an agent that actually does things on your server.",
  capabilities: [
    "Natural real-time voice conversation",
    "Background file/code/system task execution",
    "Cross-session memory (Obsidian vault + nightly consolidation)",
  ],
  version: "0.1.0",
  firstParty: true,
}
