# Contributing

## Deterministic Validation Policy

Before opening a pull request, run deterministic validation locally:

```bash
./scripts/pre-pr-check.sh --fast
```

Use full validation when Android is affected or before release-level merges:

```bash
./scripts/pre-pr-check.sh --full
```

For CI-parity local verification (same default scope as CI):

```bash
./scripts/pre-pr-check.sh --ci
```

Equivalent direct commands:

- Fast (API + web): `./scripts/dev-test.sh --skip-android`
- Full (API + web + Android): `./scripts/dev-test.sh`

## Code Owners

Code ownership is defined in `.github/CODEOWNERS` for sensitive paths (auth/middleware, CI/workflows, deterministic scripts, and Android deterministic build entrypoint).

## Recommended Branch Protection (GitHub)

For `main`, enable these repository settings:

- Require a pull request before merging
- Require status checks to pass before merging
- Required check: `Deterministic Validate / validate`
- Require branches to be up to date before merging
- Dismiss stale approvals when new commits are pushed

## Local Stack Helpers

Use deterministic local scripts from repo root:

- `./scripts/dev-up.sh`
- `./scripts/dev-status.sh`
- `./scripts/dev-logs.sh api`
- `./scripts/dev-logs.sh web`
- `./scripts/dev-down.sh`
- `./scripts/dev-reset.sh --purge`

## Additional Governance Docs

- Security policy: `SECURITY.md`
- Release process: `release-checklist.md`
- Changelog: `CHANGELOG.md`
- Issue templates: `.github/ISSUE_TEMPLATE/`

## Release Verification

Use automated release checks from repo root:

```bash
./scripts/release-verify.sh
./scripts/release-verify.sh --full
```
