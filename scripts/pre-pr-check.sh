#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  echo "Usage: ./scripts/pre-pr-check.sh [--full|--fast|--ci|--ci-enforcement]"
  echo "  --fast (default): API+web deterministic validation"
  echo "  --full:            API+web+Android deterministic validation"
  echo "  --ci:              mirror CI default (full deterministic validation)"
  echo "  --ci-enforcement:  full deterministic validation + backend enforcement contract"
}

MODE="fast"
if [[ "${1:-}" == "--full" ]]; then
  MODE="full"
elif [[ "${1:-}" == "--ci" ]]; then
  MODE="ci"
elif [[ "${1:-}" == "--ci-enforcement" ]]; then
  MODE="ci-enforcement"
elif [[ "${1:-}" == "--fast" || -z "${1:-}" ]]; then
  MODE="fast"
elif [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
else
  usage
  exit 1
fi

if [[ "$MODE" == "fast" ]]; then
  if git status --porcelain -- android | grep -q .; then
    echo "[pre-pr-check] Detected Android changes in working tree."
    echo "[pre-pr-check] Running full validation is recommended: ./scripts/pre-pr-check.sh --full"
  fi

  echo "[pre-pr-check] Running fast deterministic validation"
  ./scripts/dev-test.sh --skip-android
elif [[ "$MODE" == "ci" ]]; then
  echo "[pre-pr-check] Running CI-parity deterministic validation"
  ./scripts/dev-test.sh
elif [[ "$MODE" == "ci-enforcement" ]]; then
  echo "[pre-pr-check] Running CI-parity deterministic validation with enforcement contract"
  ./scripts/dev-test.sh
  cleanup_stack() {
    ./scripts/dev-down.sh --with-db || true
  }
  trap cleanup_stack EXIT
  ./scripts/dev-up.sh
  ./scripts/run-enforcement-if-ready.sh --require-ready
  cleanup_stack
  trap - EXIT
else
  echo "[pre-pr-check] Running full deterministic validation"
  ./scripts/dev-test.sh
fi

echo "[pre-pr-check] Done"
