#!/usr/bin/env bash
# local-inference install - Ollama for Qwen2.5-14B (primary LLM) + nomic-embed-text (embeddings).
# Idempotent.
set -euo pipefail

if ! command -v ollama >/dev/null 2>&1; then
  echo "[local-inference] installing Ollama"
  curl -fsSL https://ollama.com/install.sh | sh
fi

systemctl enable --now ollama 2>/dev/null || true

for i in {1..12}; do
  curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && break
  echo "[local-inference] waiting for Ollama... (${i}/12)"
  sleep 5
done

echo "[local-inference] pulling embedding model: nomic-embed-text"
ollama pull nomic-embed-text

echo "[local-inference] pulling primary LLM: qwen2.5:14b (~9 GB, this may take a few minutes)"
ollama pull qwen2.5:14b

echo "[local-inference] done. Models loaded:"
curl -s http://127.0.0.1:11434/api/tags | grep -o '"name":"[^"]*"' || true
