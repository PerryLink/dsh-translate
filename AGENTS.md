# AGENTS.md — dsh-translate

Standalone DeepSeek Harness plugin repository (`dsh-translate`, JS form:
plain-JS host + hand-written client bundle). Repo-local decisions live here.

## Layout

- `index.mjs` — the host face (`name` / `inject` / `Config` / `resolveConfig` /
  `apply`; no default export). Mounts the `translatePage` service.
- `lib/service.mjs` — `TranslateService extends TypertRemoteService`; resolves
  the route (config pair, else newest live `request/header`) and calls
  `ctx.llm.stream`. Read-only: no session append, no file write.
- `lib/engine.mjs` — prompt, batching, JSON-array parsing and placeholder
  verification. No cordis, no DOM; the unit-test seam.
- `lib/wire.mjs` — zod schemas + invocation descriptors shared by the host
  manifest and (by hand) the client bundle.
- `typert.host.mjs` — host Typert manifest exported as `./typert`.
- `client/index.js` — hand-written client bundle (`window.__ModuleLoader__.load`):
  DOM walk, masking, cache, flicker handling and the floating control. It holds
  a hand-copied descriptor list; `test/descriptors.test.mjs` fails on drift.
- `test/*.test.mjs` — `node --test`; jsdom is used for the DOM engine tests.

## Hard rules

- **Display-only.** No `session.append`, no workspace write, no DSH config write.
  Translations live in the DOM plus a bounded `localStorage` cache.
- **Fail closed.** A translation that drops, renumbers or invents a `⟦n⟧`
  placeholder keeps the original text. A segment with no prose left is skipped.
- **No credentials.** The plugin never reads an API key; the host provider owns
  authentication.
- **Bounded calls.** `maxSegments`, `maxChars` and `timeoutMs` are Config fields
  (Schemastery, fail-loud), documented in `cordis.patch.yml` and both READMEs.
- **No build step.** The client bundle is loaded raw; do not add a bundler
  without updating the loader shape and the descriptor parity test.

## Checks

`pnpm test && pnpm run lint && pnpm run verify:self-contained && pnpm pack`
