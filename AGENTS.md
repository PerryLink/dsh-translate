# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-translate`, JS form: pure host). Development follows the dsh-plugin-guide skill and the official plugin contract; this file records repo-local decisions.

## Layout

- `index.mjs` — the only host face (`name`/`inject`/`Config`/`apply`; NO default export). Injects `commands` + `tools`.
- `lib/rosetta.mjs` — pure data + pure functions ported from GPT-Rosetta-Stone (Apache-2.0): 11 vendors × 13 canonical parameters. Rows marked `source: 'ported'` come from the upstream table and are never changed; `extended` rows extend the trio from public API references (per the module header).
- `lib/fix.mjs` — pure deterministic JSON repair ported from JSON-Schema-Enforcer-Proxy (Apache-2.0): fence extraction, parse, text strategies (escape/trailing-comma/truncation-closure), required-field completion with `null` placeholders, and validation against the supported keyword subset (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const` — mirrors the harness tool registry). The upstream retry arm re-asked an LLM; a post-execute listener must be deterministic, so it became a bounded strategy loop instead.
- `lib/sanitize.mjs` — pure bounded display/audit sanitization for diffs.
- `types.d.ts` — hand-written declarations for the package consumers AND the checkJs contract; `tsconfig.check.json` binds this file to `index.mjs` through the package.json `types` field, so the d.ts is the source of truth for the implementation's shapes.
- `test/*.test.mjs` — `node --test`. Pure suites for the libs (including upstream-converted regression cases), plus an assembly suite that mounts real `Context` + real `SessionStore`/`ToolRuntime`/`Commands` from the 0.1.2-alpha.5 peers with a structurally complete fake agent.

## Seam conclusions (verified against 0.1.2-alpha.5)

- **`tools/post-execute`** receives `(exec, result, next)`; a `{kind:'accept', value}` decision replaces a SUCCESS value and the registry re-validates + re-renders it. Replacing a FAILED result's value throws; and a schema-violating success never reaches post-execute (the registry fails it first). The reachable, repairable case is therefore a successful result whose canonical value is a **string carrying JSON text**, from a tool whose output schema root is string-rooted or unconstrained (`json`-rooted — its raw schema is annotation-only), or opted in through `repair.toolNames`. The listener always calls `next()` unless it claims the call with a validated replacement; failures are never flipped.
- **Accept replacement shape**: container-rooted and unconstrained schemas receive the PARSED object; string roots receive the repaired TEXT. Both survive re-validation (the `json` root accepts either).
- **`fieldCompletion` semantics**: missing `required` fields are filled with `null`, which only lands when `null` is schema-legal (e.g. `oneOf` with a null branch); otherwise repair fails closed with `SCHEMA_VIOLATION` — null is a placeholder, never data.
- **Session append is two-argument** — the pinned alpha.5 peers have no append-envelope option, and the two-argument form typechecks against rc.2 and newer builds. `translate/fix` is declared via `types.d.ts` declaration merging and is log-only (counts/flags, never payloads). The append goes through the adaptive gate (`KNOWN_SESSION_EVENT_TYPES` membership first, then the `ignorable`-in-source probe): hosts that know the type append plainly, hosts with the `ignorable` envelope append with the marker, and envelope-less hosts (`0.1.0-rc.6`–`0.1.1-rc.2`, `0.1.2-alpha.5`, which fails closed on unknown types at read) get no append — a repair never pollutes the session log, and the repair outcome never depends on the audit.
- **checkJs boundaries**: `defineTool`'s generic inference cannot be reconciled across the two peer type copies in this JS-form repo, so the `fix_json` options object and a few boundary params carry documented `any` casts; runtime behavior is covered by the assembly tests, and `types.d.ts` documents the public surface. The repo's `check` gate must stay green.

## Hard rules applied here

- Registrations are effects (`ctx.effect` with a disposer-returning register); the post-execute listener is the only waterfall and it calls `next()` on every non-claimed path.
- Repair never invents data, never flips failures, and never logs payloads — audit events carry counts and flags only.
- Hostile schemas fail closed: unknown keywords rejected, circular schemas rejected, oneOf bounded by `MAX_ONE_OF_DEPTH` and `MAX_ONE_OF_BUDGET`.
- No hardcoded tunables: every switch/bound is a `Config` field (Schemastery, fail-loud) documented in `cordis.patch.yml` and the five-language READMEs.
- `upstream/` is read-only reference, gitignored, and excluded from the published files; both upstream assets are Apache-2.0 and credited in `THIRD_PARTY_NOTICES.md`.

## Checks

`pnpm test && pnpm run check && pnpm run verify:self-contained && pnpm run verify:artifacts && node scripts/check-readme-sync.mjs && pnpm pack`

## Docs

- Five-language READMEs — English is the source of truth; `scripts/check-readme-sync.mjs` (and CI) enforce the shared section structure, the install command, and the config-table keys.
- GitHub topics `dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `json-repair`, `schema-validation`, `parameter-mapping`, `llm-api`, `tooling` (mirror `package.json` keywords; the ecosystem's visibility channel is the `dsh-plugin` topic).
- License is Apache-2.0 (`LICENSE` + package.json `license`).
