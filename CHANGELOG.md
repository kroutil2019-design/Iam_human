# Changelog

All notable changes to this project are documented in this file.

The format is based on Keep a Changelog.

## [Unreleased]

### Added
- Deterministic local stack scripts: `dev-up`, `dev-status`, `dev-down`, `dev-reset`, `dev-logs`, `dev-test`, `pre-pr-check`
- Deterministic CI workflow: `.github/workflows/deterministic-validate.yml`
- Governance docs: `CONTRIBUTING.md`, `SECURITY.md`, `release-checklist.md`, `.github/CODEOWNERS`, `.github/pull_request_template.md`

### Changed
- API startup now validates required environment variables via `apps/api/src/config/env.ts`
- Android deterministic build flow documented and scripted via `android/build-debug.sh`
- Web admin login flow now only succeeds on HTTP OK and surfaces API errors

### Fixed
- Android build blockers: missing AndroidX gradle properties, invalid theme parent, and missing Compose pager opt-in
- Runtime deterministic setup gaps across API, web, and Android build/test flows
