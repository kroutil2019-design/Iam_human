#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web"
ANDROID_BUILD_SCRIPT="$ROOT_DIR/android/build-debug.sh"
RUN_ANDROID=true

if [[ "${1:-}" == "--skip-android" ]]; then
  RUN_ANDROID=false
fi

printf "[dev-test] API TypeScript build...\n"
(
  cd "$API_DIR"
  npm run build
)

printf "[dev-test] Web TypeScript/Vite build...\n"
(
  cd "$WEB_DIR"
  npm run build
)

if [[ "$RUN_ANDROID" == "true" ]]; then
  printf "[dev-test] Android app + SDK debug build...\n"
  "$ANDROID_BUILD_SCRIPT"
else
  printf "[dev-test] Skipping Android build (--skip-android).\n"
fi

printf "[dev-test] All deterministic checks passed.\n"
