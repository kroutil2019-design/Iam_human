#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
DB_CONTAINER="iamhuman-postgres"

show_pid_status() {
  local name="$1"
  local pid_file="$RUN_DIR/${name}.pid"

  if [[ ! -f "$pid_file" ]]; then
    echo "$name: not tracked"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "$name: running (pid=$pid)"
  else
    echo "$name: stopped (stale pid file)"
  fi
}

show_pid_status "api"
show_pid_status "web"

if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -Fxq "$DB_CONTAINER"; then
    echo "postgres: running ($DB_CONTAINER)"
  elif docker ps -a --format '{{.Names}}' | grep -Fxq "$DB_CONTAINER"; then
    echo "postgres: stopped ($DB_CONTAINER)"
  else
    echo "postgres: not created"
  fi
else
  echo "postgres: docker not available"
fi
