## Summary

Describe the change and scope.

## Deterministic Validation

Check one of the following before requesting review:

- [ ] Ran full deterministic validation: `./scripts/dev-test.sh`
- [ ] Ran fast deterministic validation: `./scripts/dev-test.sh --skip-android`

If you skipped Android, explain why this PR does not affect Android paths.

## Local Runtime (if applicable)

- [ ] Started stack with `./scripts/dev-up.sh`
- [ ] Checked status with `./scripts/dev-status.sh`
- [ ] Stopped/cleaned with `./scripts/dev-down.sh` or `./scripts/dev-reset.sh`

## Risk and Rollback

- Risk level: Low / Medium / High
- Rollback approach:
