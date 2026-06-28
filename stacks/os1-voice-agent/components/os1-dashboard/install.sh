#!/usr/bin/env bash
# os1-dashboard install - build the OS1 React UI and serve its static bundle.
# Secret-free: only the public ElevenLabs Agent ID is injected (safe for the browser).
#   ELEVENLABS_AGENT_ID  (from required credential)
set -euo pipefail

COMP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="${COMP_DIR}/ui"
SERVE_DIR="/opt/os1/dashboard"

: "${ELEVENLABS_AGENT_ID:?missing}"

echo "[os1-dashboard] writing .env.local"
cat > "${UI_DIR}/.env.local" <<ENV
VITE_ELEVENLABS_AGENT_ID=${ELEVENLABS_AGENT_ID}
ENV

echo "[os1-dashboard] building UI"
cd "${UI_DIR}"
npm install --no-audit --no-fund
npm run build

echo "[os1-dashboard] publishing bundle to ${SERVE_DIR}"
mkdir -p "${SERVE_DIR}"
rm -rf "${SERVE_DIR:?}/"*
cp -r "${UI_DIR}/dist/." "${SERVE_DIR}/"

# The ZenCore base reverse proxy serves ${SERVE_DIR} at the tenant root "/".
echo "[os1-dashboard] done. Served at the tenant root URL."
