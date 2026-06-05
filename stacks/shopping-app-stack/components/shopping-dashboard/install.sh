#!/usr/bin/env bash
# shopping-dashboard install — build React UI on the VPS.
set -euo pipefail

COMP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="${COMP_DIR}/ui"
SERVE_DIR="/opt/shopping-app/dashboard"

echo "[shopping-dashboard] building UI"
cd "${UI_DIR}"
npm install --no-audit --no-fund
npm run build

echo "[shopping-dashboard] copying bundle to ${SERVE_DIR}"
mkdir -p "${SERVE_DIR}"
rm -rf "${SERVE_DIR:?}/"*
cp -r "${UI_DIR}/dist/." "${SERVE_DIR}/"

echo "[shopping-dashboard] done. Served by gateway at http://127.0.0.1:18792/"
