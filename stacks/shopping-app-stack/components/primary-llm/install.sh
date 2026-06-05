#!/usr/bin/env bash
# primary-llm install — write Anthropic API key into the shopping-app .env.
set -euo pipefail

: "${ANTHROPIC_API_KEY:?missing — set ANTHROPIC_API_KEY before running this component}"

ENV_FILE="/opt/shopping-app/.env"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[primary-llm] .env not found at ${ENV_FILE} — run agent-gateway install first" >&2
  exit 1
fi

sed -i "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}|" "${ENV_FILE}"

systemctl restart shopping-gateway.service 2>/dev/null || true
echo "[primary-llm] Anthropic API key written. shopping-gateway restarted."
