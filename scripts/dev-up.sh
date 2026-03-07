#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web"
DB_CONTAINER="iamhuman-postgres"
DB_IMAGE="postgres:14"

mkdir -p "$RUN_DIR"

ensure_postgres() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: docker is required for deterministic local PostgreSQL." >&2
    exit 1
  fi

  if docker ps --format '{{.Names}}' | grep -Fxq "$DB_CONTAINER"; then
    echo "[dev-up] PostgreSQL container already running: $DB_CONTAINER"
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -Fxq "$DB_CONTAINER"; then
    echo "[dev-up] Starting existing PostgreSQL container: $DB_CONTAINER"
    docker start "$DB_CONTAINER" >/dev/null
    return
  fi

  echo "[dev-up] Creating PostgreSQL container: $DB_CONTAINER"
  docker run -d \
    --name "$DB_CONTAINER" \
    -e POSTGRES_USER=iamhuman \
    -e POSTGRES_PASSWORD=iamhuman \
    -e POSTGRES_DB=iamhuman \
    -p 5432:5432 \
    "$DB_IMAGE" >/dev/null
}

ensure_api_env() {
  if [[ ! -f "$API_DIR/.env" ]]; then
    echo "[dev-up] Creating apps/api/.env from .env.example"
    cp "$API_DIR/.env.example" "$API_DIR/.env"
  fi
}

run_migration() {
  echo "[dev-up] Running API migration"
  (
    cd "$API_DIR"
    npm run db:migrate
  )
}

ensure_api_port_available() {
  local pid_file="$RUN_DIR/api.pid"
  local tracked_pid=""

  if [[ -f "$pid_file" ]]; then
    tracked_pid="$(cat "$pid_file")"
  fi

  local listeners
  listeners="$(lsof -t -i :4000 -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$listeners" ]]; then
    return
  fi

  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    if [[ -n "$tracked_pid" && "$pid" == "$tracked_pid" ]]; then
      continue
    fi
    echo "[dev-up] Killing stale process on :4000 (pid=$pid)"
    kill -9 "$pid" 2>/dev/null || true
  done <<< "$listeners"
}

start_process() {
  local name="$1"
  local cmd="$2"
  local cwd="$3"
  local pid_file="$RUN_DIR/${name}.pid"
  local log_file="$RUN_DIR/${name}.log"

  if [[ -f "$pid_file" ]]; then
    local old_pid
    old_pid="$(cat "$pid_file")"
    if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
      echo "[dev-up] $name already running (pid=$old_pid)"
      return
    fi
    rm -f "$pid_file"
  fi

  echo "[dev-up] Starting $name"
  (
    cd "$cwd"
    nohup bash -lc "$cmd" >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )
}

ensure_postgres
ensure_api_env
ensure_api_port_available
run_migration
start_process "api" "npm run dev" "$API_DIR"
start_process "web" "npm run dev" "$WEB_DIR"

echo "[dev-up] Done"
echo "[dev-up] API log: $RUN_DIR/api.log"
echo "[dev-up] Web log: $RUN_DIR/web.log"
echo "[dev-up] Stop everything with: ./scripts/dev-down.sh"
