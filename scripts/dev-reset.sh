#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
DB_CONTAINER="iamhuman-postgres"

"$ROOT_DIR/scripts/dev-down.sh" "${1:-}"

if [[ "${1:-}" == "--with-db" ]] || [[ "${1:-}" == "--purge" ]]; then
  if command -v docker >/dev/null 2>&1 && docker ps -a --format '{{.Names}}' | grep -Fxq "$DB_CONTAINER"; then
    echo "[dev-reset] Removing PostgreSQL container: $DB_CONTAINER"
    docker rm -f "$DB_CONTAINER" >/dev/null
  else
    echo "[dev-reset] PostgreSQL container not found"
  fi
fi

if [[ "${1:-}" == "--purge" ]]; then
  echo "[dev-reset] Removing runtime files: $RUN_DIR"
  rm -rf "$RUN_DIR"
fi

echo "[dev-reset] Done"
