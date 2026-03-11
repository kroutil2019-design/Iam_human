#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_ENV="$ROOT_DIR/apps/api/.env"
FULL=false
DRY_RUN=false
STARTED_STACK=false
API_PORT="4000"

usage() {
  echo "Usage: ./scripts/release-verify.sh [--full] [--dry-run]"
  echo "  default: static release checks"
  echo "  --full:  includes CI-parity build + runtime sanity checks"
  echo "  --dry-run: print planned checks without executing"
}

for arg in "$@"; do
  case "$arg" in
    --full)
      FULL=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

run_cmd() {
  local description="$1"
  shift

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $description"
    echo "          $*"
    return
  fi

  echo "[release-verify] $description"
  "$@"
}

require_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "[release-verify] Missing required file: $file" >&2
    exit 1
  fi
}

resolve_api_port() {
  require_file "$API_ENV"
  local configured
  configured="$(grep -E '^PORT=' "$API_ENV" | tail -n1 | cut -d'=' -f2- | tr -d '[:space:]')"
  if [[ -n "$configured" ]]; then
    API_PORT="$configured"
  fi
}

check_changelog() {
  require_file "$ROOT_DIR/CHANGELOG.md"
  if ! grep -q "## \[Unreleased\]" "$ROOT_DIR/CHANGELOG.md"; then
    echo "[release-verify] CHANGELOG missing [Unreleased] section" >&2
    exit 1
  fi
  echo "[release-verify] CHANGELOG format looks valid"
}

check_governance_files() {
  require_file "$ROOT_DIR/.github/ISSUE_TEMPLATE/security-report.yml"
  require_file "$ROOT_DIR/.github/ISSUE_TEMPLATE/config.yml"
  require_file "$ROOT_DIR/release-checklist.md"
  require_file "$ROOT_DIR/SECURITY.md"
  echo "[release-verify] Governance files present"
}

check_api_env_required_vars() {
  require_file "$API_ENV"
  local missing=0
  for name in DATABASE_URL JWT_SECRET ADMIN_API_KEY; do
    if ! grep -Eq "^${name}=.+" "$API_ENV"; then
      echo "[release-verify] Missing or empty $name in apps/api/.env" >&2
      missing=1
    fi
  done
  if [[ "$missing" -ne 0 ]]; then
    exit 1
  fi
  echo "[release-verify] Required API env vars present"
}

ensure_stack_running() {
  if curl -fsS -m 5 "http://localhost:${API_PORT}/health" >/dev/null 2>&1; then
    echo "[release-verify] API already running"
    return
  fi

  run_cmd "Starting local stack" "$ROOT_DIR/scripts/dev-up.sh"
  STARTED_STACK=true
}

runtime_sanity_checks() {
  local admin_key
  admin_key="$(grep -E '^ADMIN_API_KEY=' "$API_ENV" | head -n1 | cut -d'=' -f2-)"

  if [[ -z "$admin_key" ]]; then
    echo "[release-verify] ADMIN_API_KEY is empty in apps/api/.env" >&2
    exit 1
  fi

  run_cmd "Health check" curl -fsS -m 5 "http://localhost:${API_PORT}/health"

  local bad_status ok_status
  bad_status="$(curl -s -o /tmp/release_admin_bad.json -w '%{http_code}' -H 'x-admin-key: wrong' "http://localhost:${API_PORT}/admin/users")"
  ok_status="$(curl -s -o /tmp/release_admin_ok.json -w '%{http_code}' -H "x-admin-key: $admin_key" "http://localhost:${API_PORT}/admin/users")"

  if [[ "$bad_status" != "403" ]]; then
    echo "[release-verify] Expected 403 for invalid admin key, got $bad_status" >&2
    exit 1
  fi

  if [[ "$ok_status" != "200" ]]; then
    echo "[release-verify] Expected 200 for valid admin key, got $ok_status" >&2
    exit 1
  fi

  echo "[release-verify] Runtime admin auth sanity checks passed"
}

cleanup() {
  if [[ "$STARTED_STACK" == "true" && "$DRY_RUN" == "false" ]]; then
    "$ROOT_DIR/scripts/dev-down.sh" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

run_cmd "Check governance files" check_governance_files
run_cmd "Check changelog" check_changelog
run_cmd "Check required API env vars" check_api_env_required_vars
run_cmd "Resolve API port" resolve_api_port

if [[ "$FULL" == "true" ]]; then
  run_cmd "Run CI-parity deterministic validation" "$ROOT_DIR/scripts/pre-pr-check.sh" --ci
  ensure_stack_running
  runtime_sanity_checks
  echo "[release-verify] Full release verification passed"
else
  echo "[release-verify] Static release verification passed"
fi
