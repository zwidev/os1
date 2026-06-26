#!/usr/bin/env bash
# recall-integration install — Recall.ai meeting bot service
# Secrets arrive as env vars (filled by ZenCore provisioner):
#   RECALL_API_KEY   (from optional credential recall_api_key)
#   PUBLIC_HOST      (from system:public_host — tenant's public hostname)
set -euo pipefail

OS1_ROOT="/opt/os1"
RECALL_DIR="${OS1_ROOT}/recall"
COMP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${RECALL_API_KEY:?missing RECALL_API_KEY}"
: "${PUBLIC_HOST:?missing PUBLIC_HOST}"

echo "[recall-integration] installing service"
mkdir -p "${RECALL_DIR}"
cp "${COMP_DIR}/recall-service.js" "${RECALL_DIR}/recall-service.js"

# --- nginx route: /recall/* -> 127.0.0.1:18791 --------------------------------
# Drop a snippet into conf.d; the ZenCore base nginx includes conf.d/*.conf.
# SSE requires proxy_buffering off + Connection '' header.
cat > /etc/nginx/conf.d/recall.conf <<'NGINX'
location /recall/ {
    proxy_pass http://127.0.0.1:18791/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    # Required for SSE (server-sent events)
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding on;
    proxy_read_timeout 3600s;
}
NGINX

if command -v nginx >/dev/null 2>&1 && nginx -t 2>/dev/null; then
  nginx -s reload
fi

# --- systemd service ----------------------------------------------------------
cat > /etc/systemd/system/recall-service.service <<UNIT
[Unit]
Description=OS1 Recall.ai Integration Service
After=network-online.target
Wants=network-online.target

[Service]
Environment=RECALL_PORT=18791
Environment=RECALL_API_KEY=${RECALL_API_KEY}
Environment=PUBLIC_HOST=${PUBLIC_HOST}
Environment=WORK_DIR=${OS1_ROOT}/.openclaw/workspace
ExecStart=$(command -v node) ${RECALL_DIR}/recall-service.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now recall-service.service

echo "[recall-integration] done."
echo "  Health:   curl -s http://127.0.0.1:18791/health"
echo "  Webhook:  POST https://${PUBLIC_HOST}/recall/webhook  (set in Recall.ai dashboard)"
