## Checklist

- [ ] All gates pass locally (`pnpm test && pnpm run check && pnpm run verify:self-contained && pnpm run verify:artifacts && node scripts/check-readme-sync.mjs && pnpm pack`)
- [ ] Tests added or updated for the behavior change
- [ ] CHANGELOG.md updated under `[Unreleased]`
- [ ] All five README language versions updated (README.md is the source)
- [ ] Related issue linked (Fixes #… / Closes #…, if any)
- [ ] No secrets, tokens, or credentials in any committed file (placeholders only)

## Description

<!-- What does this PR change and why? -->

## Verification

<!-- Commands actually run and their results. -->
