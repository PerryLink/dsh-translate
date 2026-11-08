# Contributing to dsh-translate

Thanks for helping. This project is maintained as a normal member of the PerryLink DSH plugin family.

## Before you open an issue

- Read the README and `PRIVACY.md`.
- Include the package version, DSH host version, OS/Node version, the exact action, and a minimal redacted sample (never real personal data).
- For a mistranslation, include the **original text node**, the **translated output**, the target language, and whether the page used a protected span (code, path, command, identifier).

## Pull requests

- Keep the display-only contract: no session append, no workspace write, no on-disk translation cache.
- Keep placeholder verification fail-closed: a translation that loses, renumbers or invents a `⟦n⟧` token must keep the original text.
- Add or update a test under `test/`; `pnpm test` must pass on Node 22 and 24.
- Do not add a build step to the client bundle without updating `client/index.js`'s loader shape and the descriptor parity test.
- Keep both READMEs (Chinese and English) in sync for user-visible behaviour.

## Security

Report vulnerabilities through a private security advisory, not a public issue. See `SECURITY.md`.
