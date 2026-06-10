#!/usr/bin/env bash
# grocery-cli install — uk-grocery-cli HTTP sidecar for live Tesco/Sainsbury's search.
# Clones zwidev/uk-grocery-cli, builds it, and runs groc-api on port 7876.
# Optional env:
#   SAINSBURYS_EMAIL / SAINSBURYS_PASSWORD  — auto-login Sainsbury's at startup
#   TESCO_EMAIL / TESCO_PASSWORD            — auto-login Tesco at startup
set -euo pipefail

INSTALL_DIR="/opt/uk-grocery-cli"

if ! command -v node >/dev/null 2>&1; then
  echo "[grocery-cli] Node.js not found — run agent-gateway install first" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  apt-get install -y -q git
fi

if [ ! -d "${INSTALL_DIR}/.git" ]; then
  echo "[grocery-cli] cloning uk-grocery-cli..."
  git clone --depth 1 https://github.com/zwidev/uk-grocery-cli.git "${INSTALL_DIR}"
else
  echo "[grocery-cli] updating uk-grocery-cli..."
  git -C "${INSTALL_DIR}" pull --ff-only || echo "WARN: pull failed; continuing with existing checkout"
fi

echo "[grocery-cli] installing dependencies..."
(cd "${INSTALL_DIR}" && npm install --silent)

echo "[grocery-cli] building..."
(cd "${INSTALL_DIR}" && npm run build)

# Build env block for the systemd unit
ENV_LINES="Environment=GROC_API_HOST=127.0.0.1
Environment=GROC_API_PORT=7876
Environment=GROC_PROVIDER=sainsburys"

if [ -n "${SAINSBURYS_EMAIL:-}" ]; then
  ENV_LINES="${ENV_LINES}
Environment=SAINSBURYS_EMAIL=${SAINSBURYS_EMAIL}"
fi
if [ -n "${SAINSBURYS_PASSWORD:-}" ]; then
  ENV_LINES="${ENV_LINES}
Environment=SAINSBURYS_PASSWORD=${SAINSBURYS_PASSWORD}"
fi
if [ -n "${TESCO_EMAIL:-}" ]; then
  ENV_LINES="${ENV_LINES}
Environment=TESCO_EMAIL=${TESCO_EMAIL}"
fi
if [ -n "${TESCO_PASSWORD:-}" ]; then
  ENV_LINES="${ENV_LINES}
Environment=TESCO_PASSWORD=${TESCO_PASSWORD}"
fi

cat > /etc/systemd/system/groc-api.service <<UNIT
[Unit]
Description=UK Grocery CLI HTTP API (groc-api)
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
${ENV_LINES}
ExecStart=$(command -v node) ${INSTALL_DIR}/dist/http-server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now groc-api.service
sleep 2
curl -fsS http://127.0.0.1:7876/health && echo " groc-api ok" || echo "WARN: groc-api health check failed — check logs with: journalctl -u groc-api -n 20"
echo "[grocery-cli] done. http://127.0.0.1:7876"
