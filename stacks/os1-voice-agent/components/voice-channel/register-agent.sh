#!/usr/bin/env bash
# register-agent.sh - Point the tenant's ElevenLabs agent at this server's voice proxy.
# Secrets arrive as env vars (never committed):
#   ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, TENANT_PUBLIC_URL (e.g. https://acme.zencore.solutions)
set -euo pipefail

: "${ELEVENLABS_API_KEY:?missing}"
: "${ELEVENLABS_AGENT_ID:?missing}"
: "${TENANT_PUBLIC_URL:?missing}"

SERVER_URL="${TENANT_PUBLIC_URL%/}/v1"
echo "[voice-channel] pointing agent ${ELEVENLABS_AGENT_ID} at ${SERVER_URL}"

curl -fsSL -X PATCH \
  "https://api.elevenlabs.io/v1/convai/agents/${ELEVENLABS_AGENT_ID}" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"conversation_config\":{\"agent\":{\"prompt\":{\"llm\":\"custom-llm\",\"custom_llm\":{\"url\":\"${SERVER_URL}\"}}}}}" \
  >/dev/null

echo "[voice-channel] agent registered."
