#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
DB_CONTAINER="iamhuman-postgres"

stop_pid_file() {
  local name="$1"
  local pid_file="$RUN_DIR/${name}.pid"

  if [[ ! -f "$pid_file" ]]; then
    echo "[dev-down] $name is not tracked"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "[dev-down] Stopping $name (pid=$pid)"
    kill "$pid" 2>/dev/null || true
  else
    echo "[dev-down] $name process already stopped"
  fi

  rm -f "$pid_file"
}

stop_pid_file "api"
stop_pid_file "web"

if [[ "${1:-}" == "--with-db" ]]; then
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -Fxq "$DB_CONTAINER"; then
    echo "[dev-down] Stopping PostgreSQL container: $DB_CONTAINER"
    docker stop "$DB_CONTAINER" >/dev/null
  else
    echo "[dev-down] PostgreSQL container is not running"
  fi
fi

echo "[dev-down] Done"
