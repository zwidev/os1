#!/usr/bin/env bash
# memory-vault install - create vault dirs and wire the embedding provider.
# Runs after agent-gateway (config present) and local-inference (Ollama up).
set -euo pipefail

STATE_DIR="/opt/os1/.openclaw"
WS="${STATE_DIR}/workspace"

echo "[memory-vault] creating layout"
mkdir -p "${WS}/memory" "${STATE_DIR}/wiki/main"
[ -f "${WS}/MEMORY.md" ] || cat > "${WS}/MEMORY.md" <<'MD'
# MEMORY

Durable facts, preferences, and standing decisions. Loaded at session start.
MD

# Point OpenClaw memory search at the local Ollama embedding model.
# The provisioner may instead set this via agents.defaults.memorySearch in openclaw.json.
echo "[memory-vault] embedding provider -> ollama/nomic-embed-text"
export OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"

# Build the initial memory index + initialize the Obsidian wiki vault (safe if empty).
if command -v openclaw >/dev/null 2>&1; then
  OPENCLAW_STATE_DIR="${STATE_DIR}" openclaw memory index --force || true
  OPENCLAW_STATE_DIR="${STATE_DIR}" openclaw wiki init || true
  OPENCLAW_STATE_DIR="${STATE_DIR}" openclaw wiki compile || true
  OPENCLAW_STATE_DIR="${STATE_DIR}" openclaw memory status || true
fi

# --- Auto-refresh: keep the wiki vault growing as memory grows (systemd timer) ---
COMP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 0755 "${COMP_DIR}/wiki-refresh.sh" /opt/os1/wiki-refresh.sh

cat > /etc/systemd/system/os1-wiki-refresh.service <<UNIT
[Unit]
Description=OS1 memory wiki refresh
After=agent-gateway.service
[Service]
Type=oneshot
Environment=OPENCLAW_STATE_DIR=${STATE_DIR}
ExecStart=/opt/os1/wiki-refresh.sh
UNIT

cat > /etc/systemd/system/os1-wiki-refresh.timer <<UNIT
[Unit]
Description=Refresh OS1 memory wiki every 15 minutes
[Timer]
OnBootSec=5min
OnUnitActiveSec=15min
Persistent=true
[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now os1-wiki-refresh.timer

echo "[memory-vault] done. Obsidian vault: ${STATE_DIR}/wiki/main (auto-refresh every 15m)"
