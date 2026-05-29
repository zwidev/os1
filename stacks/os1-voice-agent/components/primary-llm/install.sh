#!/usr/bin/env bash
# primary-llm install — patches gateway config to use Claude Sonnet if API key is provided.
# Skipped by the provisioner if primary_llm_api_key was not supplied at setup.
set -euo pipefail

if [ -z "${PRIMARY_LLM_API_KEY:-}" ]; then
  echo "[primary-llm] No Anthropic key supplied — Qwen2.5-14B remains primary. Nothing to do."
  exit 0
fi

CONFIG="/opt/os1/.openclaw/openclaw.json"

if [ ! -f "${CONFIG}" ]; then
  echo "[primary-llm] Config not found at ${CONFIG} — run agent-gateway install first"
  exit 1
fi

echo "[primary-llm] Anthropic key provided — switching primary model to Claude Sonnet"

node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('${CONFIG}', 'utf8'));
cfg.agents.defaults.model.primary = 'anthropic/claude-sonnet-4-6';
cfg.plugins = cfg.plugins || {};
cfg.plugins.entries = cfg.plugins.entries || {};
cfg.plugins.entries.anthropic = { enabled: true };
cfg.auth = cfg.auth || {};
cfg.auth.profiles = cfg.auth.profiles || {};
cfg.auth.profiles['anthropic:default'] = {
  provider: 'anthropic',
  mode: 'api_key',
  apiKey: process.env.PRIMARY_LLM_API_KEY
};
fs.writeFileSync('${CONFIG}', JSON.stringify(cfg, null, 2));
console.log('[primary-llm] Done — primary model: anthropic/claude-sonnet-4-6');
" 2>/dev/null || python3 -c "
import json, os
cfg = json.load(open('${CONFIG}'))
cfg['agents']['defaults']['model']['primary'] = 'anthropic/claude-sonnet-4-6'
cfg.setdefault('plugins', {}).setdefault('entries', {})['anthropic'] = {'enabled': True}
cfg.setdefault('auth', {}).setdefault('profiles', {})['anthropic:default'] = {
  'provider': 'anthropic', 'mode': 'api_key', 'apiKey': os.environ['PRIMARY_LLM_API_KEY']
}
json.dump(cfg, open('${CONFIG}', 'w'), indent=2)
print('[primary-llm] Done — primary model: anthropic/claude-sonnet-4-6')
"
