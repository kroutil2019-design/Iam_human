# Release Checklist

Use this checklist before tagging or promoting a release.

Automated helper:

```bash
./scripts/release-verify.sh
# Full verification (includes CI-parity build and runtime checks)
./scripts/release-verify.sh --full
```

## Validation

- [ ] Run CI-parity deterministic validation:

```bash
./scripts/pre-pr-check.sh --ci
```

- [ ] Ensure GitHub check `Deterministic Validate / validate` is green.
- [ ] If release changes mobile paths, verify Android artifacts exist:
  - `android/app/build/outputs/apk/debug/app-debug.apk`
  - `android/iamhuman-sdk/build/outputs/aar/iamhuman-sdk-debug.aar`

## Runtime Sanity

- [ ] Start local stack and confirm health:

```bash
./scripts/dev-up.sh
curl -s http://localhost:4000/health
./scripts/dev-status.sh
```

- [ ] Confirm admin endpoint behavior:
  - Bad key returns `403`.
  - Valid key returns `200`.

## Security and Config

- [ ] Verify required API env vars are configured for target environment:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `ADMIN_API_KEY`
- [ ] Rotate any temporary/local secrets before production rollout.
- [ ] Ensure security reporting path remains private (`.github/ISSUE_TEMPLATE/security-report.yml`, `.github/ISSUE_TEMPLATE/config.yml`).

## Release Operations

- [ ] Update `CHANGELOG.md` and release notes.
- [ ] Tag release from a reviewed commit on `main`.
- [ ] Record rollback strategy for this release.
