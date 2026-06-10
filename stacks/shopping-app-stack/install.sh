#!/usr/bin/env bash
# shopping-app-stack — stack orchestrator. Run as root on Ubuntu.
# Required env:  ANTHROPIC_API_KEY
# Optional env:  TENANT_PUBLIC_URL
set -euo pipefail

STACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
C="${STACK_DIR}/components"

echo "==> [10] agent-gateway (runtime)"
bash "${C}/agent-gateway/install.sh"

echo "==> [15] grocery-cli (uk-grocery-cli groc-api sidecar)"
bash "${C}/grocery-cli/install.sh" || echo "WARN: grocery-cli optional; continuing without live search"

echo "==> [20] primary-llm (Anthropic Claude)"
bash "${C}/primary-llm/install.sh"

echo "==> [30] shopping-dashboard (React UI)"
bash "${C}/shopping-dashboard/install.sh"

echo "==> health checks"
sleep 2
curl -fsS http://127.0.0.1:18792/health && echo " gateway ok"
echo "==> shopping-app-stack deploy complete."
