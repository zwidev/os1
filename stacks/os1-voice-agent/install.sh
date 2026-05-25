#!/usr/bin/env bash
# os1-voice-agent - stack orchestrator.
# The ZenCore provisioner normally reads stack.json and runs each component's
# install.sh in installOrder. This script does the same thing for manual /
# dev-tenant deploys. Run as root on Ubuntu.
#
# Required env (from tenant credentials; never committed):
#   PRIMARY_LLM_API_KEY        Anthropic API key
#   ELEVENLABS_API_KEY         ElevenLabs API key
#   ELEVENLABS_AGENT_ID        ElevenLabs agent id
#   TENANT_PUBLIC_URL          e.g. https://acme.zencore.solutions
# Optional:
#   GATEWAY_TOKEN              generated if unset
#   PULL_FALLBACK_MODEL=true   also pull a local fallback chat model
set -euo pipefail

STACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
C="${STACK_DIR}/components"

echo "==> [10] agent-gateway (runtime)"
bash "${C}/agent-gateway/install.sh"

echo "==> [20] primary-llm (inference-provider) - wired by agent-gateway, no install step"

echo "==> [30] local-inference (Ollama embeddings)"
bash "${C}/local-inference/install.sh" || echo "WARN: local-inference optional; continuing"

echo "==> [40] memory-vault (data)"
bash "${C}/memory-vault/install.sh"

echo "==> [50] voice-channel (ElevenLabs)"
bash "${C}/voice-channel/install.sh"

echo "==> [60] os1-dashboard (UI)"
bash "${C}/os1-dashboard/install.sh"

echo "==> health checks"
curl -fsS http://127.0.0.1:18790/health && echo " proxy ok"
echo "==> os1-voice-agent deploy complete."
