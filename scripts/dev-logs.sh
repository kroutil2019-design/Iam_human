#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"

usage() {
  echo "Usage: ./scripts/dev-logs.sh [api|web]"
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

case "$1" in
  api)
    LOG_FILE="$RUN_DIR/api.log"
    ;;
  web)
    LOG_FILE="$RUN_DIR/web.log"
    ;;
  *)
    usage
    exit 1
    ;;
esac

if [[ ! -f "$LOG_FILE" ]]; then
  echo "Log file not found: $LOG_FILE"
  echo "Start services first with: ./scripts/dev-up.sh"
  exit 1
fi

echo "Tailing $LOG_FILE"
tail -n 100 -f "$LOG_FILE"
