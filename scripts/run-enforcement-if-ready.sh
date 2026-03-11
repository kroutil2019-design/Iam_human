#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/apps/api"
API_PORT="4000"
STRICT_MODE="false"

usage() {
  echo "Usage: ./scripts/run-enforcement-if-ready.sh [--require-ready]"
  echo "  default: skip enforcement (exit 0) when API/DB are not ready"
  echo "  --require-ready: fail (exit 1) when API/DB are not ready"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--require-ready" ]]; then
  STRICT_MODE="true"
elif [[ -n "${1:-}" ]]; then
  usage
  exit 1
fi

resolve_api_port() {
  if [[ -f "$API_DIR/.env" ]]; then
    local configured
    configured="$(grep -E '^PORT=' "$API_DIR/.env" | tail -n1 | cut -d'=' -f2- | tr -d '[:space:]')"
    if [[ -n "$configured" ]]; then
      API_PORT="$configured"
    fi
  fi
}

api_ready() {
  curl -fsS -m 3 "http://localhost:${API_PORT}/health" >/dev/null 2>&1
}

db_ready() {
  (
    cd "$API_DIR"
    node <<'NODE'
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    process.exit(2);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query('SELECT 1');
    process.exit(0);
  } catch {
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore shutdown errors.
    }
  }
})();
NODE
  )
}

handle_not_ready() {
  local reason="$1"
  if [[ "$STRICT_MODE" == "true" ]]; then
    echo "[enforcement] Not ready: $reason"
    exit 1
  fi

  echo "[enforcement] Skipping: $reason"
  exit 0
}

resolve_api_port

echo "[enforcement] Checking API health on :$API_PORT"
if ! api_ready; then
  handle_not_ready "API health endpoint unavailable"
fi

echo "[enforcement] Checking DB connectivity"
if ! db_ready; then
  handle_not_ready "database not reachable via apps/api/.env DATABASE_URL"
fi

echo "[enforcement] Running backend enforcement contract"
npm --prefix "$API_DIR" run test:enforcement

echo "[enforcement] Done"
