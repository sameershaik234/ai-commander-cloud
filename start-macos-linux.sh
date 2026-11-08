#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -f "$ROOT/server/.env" ]]; then
  echo "Copy server/.env.example to server/.env and configure your API key and secrets first."
  exit 1
fi
(cd "$ROOT/server" && npm run dev) &
API_PID=$!
(cd "$ROOT/client" && npm run dev) &
WEB_PID=$!
trap 'kill "$API_PID" "$WEB_PID" 2>/dev/null || true' EXIT
wait
