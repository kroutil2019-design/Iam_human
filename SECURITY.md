# Security Policy

## Supported Versions

This project currently supports security updates on the `main` branch.

## Reporting a Vulnerability

Please do not open public GitHub issues for sensitive vulnerabilities.

1. Open a private security advisory in GitHub for this repository.
2. Include affected components (`apps/api`, `apps/web`, `android/app`, `android/iamhuman-sdk`).
3. Include reproduction steps and expected impact.

## Deterministic Incident Triage (Maintainers)

Use these commands from repo root for reproducible triage:

```bash
./scripts/dev-up.sh
./scripts/dev-status.sh
./scripts/dev-logs.sh api
./scripts/dev-logs.sh web
./scripts/pre-pr-check.sh --ci
```

If local runtime becomes inconsistent:

```bash
./scripts/dev-reset.sh --purge
./scripts/dev-up.sh
```

## Key Areas to Review First

- Auth verification and signing: `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/auth.ts`
- Human proof issuance/verification: `apps/api/src/routes/proofs.ts`
- CI and deterministic scripts: `.github/workflows/`, `scripts/`
- Android deterministic build entrypoint: `android/build-debug.sh`
