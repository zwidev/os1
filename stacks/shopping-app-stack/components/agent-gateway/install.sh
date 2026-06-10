#!/usr/bin/env bash
# shopping-app agent-gateway install — Node.js runtime + server.
set -euo pipefail

APP_DIR="/opt/shopping-app"
DATA_DIR="${APP_DIR}/data"
COMP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "${APP_DIR}" "${DATA_DIR}"

# Node.js 20+ required
if ! command -v node >/dev/null 2>&1; then
  echo "[agent-gateway] installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

cp "${COMP_DIR}/server.js" "${APP_DIR}/server.js"
cp "${COMP_DIR}/package.json" "${APP_DIR}/package.json"

(cd "${APP_DIR}" && npm install --omit=dev --silent)

# Seed .env — primary-llm component fills ANTHROPIC_API_KEY later
if [ ! -f "${APP_DIR}/.env" ]; then
  cat > "${APP_DIR}/.env" <<'ENV'
SHOPPING_PORT=18792
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=
STATIC_DIR=/opt/shopping-app/dashboard
DATA_DIR=/opt/shopping-app/data
GROC_API_URL=http://127.0.0.1:7876
ENV
fi

cat > /etc/systemd/system/shopping-gateway.service <<UNIT
[Unit]
Description=Shopping App Gateway
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=$(command -v node) ${APP_DIR}/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now shopping-gateway.service
echo "[agent-gateway] done. http://127.0.0.1:18792"
