#!/usr/bin/env bash
# local-inference install - Ollama for local embeddings (semantic memory) + optional fallback.
# Idempotent. Optional component; deploy skips it if not selected.
set -euo pipefail

if ! command -v ollama >/dev/null 2>&1; then
  echo "[local-inference] installing Ollama"
  curl -fsSL https://ollama.com/install.sh | sh
fi

systemctl enable --now ollama 2>/dev/null || true

echo "[local-inference] pulling embedding model"
ollama pull nomic-embed-text

# Optional offline chat fallback - comment out to save disk/RAM
if [ "${PULL_FALLBACK_MODEL:-false}" = "true" ]; then
  echo "[local-inference] pulling fallback chat model"
  ollama pull qwen2.5:7b
fi

echo "[local-inference] done. Tags: curl -s http://127.0.0.1:11434/api/tags"
