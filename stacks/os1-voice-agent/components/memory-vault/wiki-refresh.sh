#!/usr/bin/env bash
# wiki-refresh.sh - refresh the OS1 memory wiki vault.
# index memory -> import bridge artifacts -> recompile the Obsidian vault.
# Invoked on a 15-min systemd timer (os1-wiki-refresh.timer).
set -uo pipefail
export OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-/opt/os1/.openclaw}"

openclaw memory index            >/dev/null 2>&1 || true
openclaw wiki bridge import      >/dev/null 2>&1 || true
openclaw wiki compile            >/dev/null 2>&1 || true
