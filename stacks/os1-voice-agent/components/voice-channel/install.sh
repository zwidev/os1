#!/usr/bin/env bash
# voice-channel install - register the ElevenLabs agent with this tenant's public proxy URL.
# Runs after agent-gateway is healthy.
set -euo pipefail

COMP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Wait for the local proxy to be healthy before registering externally.
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:18790/health >/dev/null 2>&1; then break; fi
  sleep 1
done

bash "${COMP_DIR}/register-agent.sh"
echo "[voice-channel] done."
