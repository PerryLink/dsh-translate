# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.15] - 2026-09-24
### Changed

- Host pins move to `0.1.7-rc.1`; re-verified against that host line. Every `@deepseek-ai/dsh-*` dev/test dependency now pins `0.1.7-rc.1`, the `pnpm-lock.yaml` graph is regenerated, `dshWorkshop.compatibility.dshVersions` appends `0.1.7-rc.1`, the monthly Compat workflow and the CI probe install the `0.1.7-rc.1` host, and the compatibility baseline in every README records `dsh-v0.1.7-rc.1`. The declared host ranges (`engines.dsh` and the `peerDependencies` union) are deliberately **unchanged** — they already admit `0.1.7-rc.1`, and a range is what the manifest accepts, not what has been tested.

## [0.2.14] - 2026-09-23

### Changed

- Move the `@deepseek-ai/dsh-*` dev/test pins to the published `0.1.7-alpha.2` line and record `0.1.7-alpha.2` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now installs the `0.1.7-alpha.2` host (`dsh-base` + `dsh-headless`) instead of `0.1.6-alpha.2`.
- Append the fourth host clause `|| >=0.1.7-0 <0.2.0` to `engines.dsh` and to all three `@deepseek-ai/dsh-*` peer ranges (`dsh-commands`, `dsh-session`, `dsh-tools`). Under semver's prerelease rule a range whose only prerelease comparators sit on earlier tuples cannot admit a later alpha, so the three-clause band excluded the very host line this release targets. No previously supported host line is dropped.
- Raise the `@deepseek-ai/cordis` dev/test pin to `^4.0.4`.

### Docs

- Correct `AGENTS.md`: the `test/*.test.mjs` layout entry and the "Session append is two-argument" seam conclusion both described the installed peers as pinned to `0.1.5-rc.2` devDependencies. The five READMEs already named `dsh-v0.1.7-alpha.2` and the four-clause peer range, so they needed no change.

## [0.2.13] - 2026-09-22

### Fixed

- Repair a mojibake artifact in the `package.json` `description`: an em dash had been double-encoded into `U+9225`. That field is published, so the registry document and the npm package page rendered the corrupted text, and a raw CJK code point has no business in that field at all.

## [0.2.12] - 2026-09-19

### Added

- `pnpm run check:lockfile` (`scripts/check-lockfile-drift.mjs`) fails fast when `package.json` and `pnpm-lock.yaml` disagree; the probe is read-only and the documented checks chain runs it alongside the other gates.

### Changed

- The release workflow now publishes through **npm trusted publishing** (OIDC) instead of the long-lived `NPM_TOKEN` secret: `setup-node` no longer sets `registry-url` (its empty `_authToken` line made the registry answer 404 on PUT), npm is upgraded to >= 11.5.1 before publishing, and the "NPM_TOKEN is not set -> skip" guard is gone so a missing publisher cannot turn a release into a silent no-op.
## [0.2.11] - 2026-09-18

### Changed

- Raise the `@deepseek-ai/dsh-*` dev/test pins from `0.1.5-rc.2` to `0.1.6-alpha.2`. The regeneration drops the four stale `@deepseek-ai/dsh-code-runtime` entries the rc.2 peer graph carried into `pnpm-lock.yaml` (`grep -c dsh-code-runtime pnpm-lock.yaml` is now 0); the package itself never depended on that group. Both typecheck rulers and the full test suite stay green against the new pins.

### Docs

- Qualify the seam baseline statements in `AGENTS.md` (the pinned peers are `0.1.5-rc.2`; the `0.1.2-rc.1` wording now records where the seam was originally verified) and enumerate the `0.1.6-alpha.2` append class in `index.mjs`: `Session.append<T>(type, data, ...opts)` takes a third argument only for surface-eligible event types and that argument is a `SurfaceIntent`, never an `ignorable` envelope — a non-surface `translate/fix` type has no third parameter, so the adaptive gate still skips and the tool result stays the model-visible log. No behavior change.

## [0.2.10] - 2026-09-12

### Changed

- Rename the four translated READMEs to `README-<lang>.md`. npm selects the package-page readme as the first markdown file matching its `{README,README.*}` glob (`@npmcli/package-json`, publish path), and that glob order puts `README.<lang>.md` ahead of `README.md` — so npm was serving the Simplified-Chinese file for this package too (measured on 15/15 sampled packages of the family). The new names sit outside the glob, so the English source is served again. No content changed apart from the language-switcher link each translation holds to its siblings, and the repo readme gate still passes. Takes effect with the next release; an already-published version cannot gain a corrected readme retroactively.
- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.2` line and record `0.1.5-rc.2` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.2`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

## [0.2.9] - 2026-09-10

### Changed

- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.1` line and record `0.1.5-rc.1` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.1`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

### Docs

- Refresh the five-language README compatibility baseline to `dsh-v0.1.5-rc.1` (verified 2026-09-10).

## [0.2.8] - 2026-09-09

### Changed

- Align the `@deepseek-ai/dsh-*` peer ranges to `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` and pin the dev/test dependencies to the published `0.1.5-alpha.1` line: adaptation to DeepSeek Harness `dsh-v0.1.5-alpha.1` (session format V3, `ctx.agent` removal, `Inbox` type-only interface); runtime behavior is unchanged for every supported host line.
- Record `0.1.5-alpha.1` in `dshWorkshop.compatibility.dshVersions`.

### Docs

- Refresh the five-language README compatibility baseline to `dsh-v0.1.5-alpha.1` (verified 2026-09-09).

## [0.2.7] - 2026-09-08

### Docs

- Repair GBK mojibake in the package.json description: the em dash was corrupted to the U+9225 U+003F marker pair; the description is restored to the clean pre-corruption text; no behavior change.


## [0.2.6] - 2026-09-07

### Docs

- Fix the DSH plugin badge URL: shields.io rejects the four-segment static badge form with "404 badge not found"; the label now uses the documented double-dash form (`dsh--plugin`), rendering identically; no behavior change.


## [0.2.5] - 2026-09-07

### Fixed

- Align the `@deepseek-ai/dsh-*` peer ranges to `>=0.1.2-rc.1 <0.2.0`: the older `>=0.1.0-rc.8 <0.2.0` band resolved to only the `0.1.0-rc.8` prerelease under registry-driven resolution and broke fresh tarball installs; no behavior change.

### Docs

- Refresh the five-language README support-version wording: the verified GitHub tag `dsh-v0.1.3-alpha.1` now leads the compatibility claim, while npm `0.1.2-rc.1` stays the published dependency-pin line (peers `>=0.1.2-rc.1 <0.2.0`); no behavior change.


## [0.2.4] - 2026-09-04

### Changed

- Align the devDependency pins to the published dsh `0.1.2-rc.1` line (5 `@deepseek-ai/dsh-*` packages), the `dshWorkshop` compatibility list, the compat workflow's CLI/base/headless installs, and the release-age exclusions; the five-language READMEs record the rc.1 facts. No behavior change: the adaptive `translate/fix` audit gate behaves identically on `0.1.2-rc.1` (`Session.append` still cannot stamp the `ignorable` marker).

## [0.2.3] - 2026-09-02

### Changed

- Align the devDependency pins to the published dsh 0.1.2-alpha.5 line and re-verify the adaptation claims; no behavior change.

## [0.2.2] - 2026-09-01

### Changed

- Upgrade the `@deepseek-ai/dsh-*` dev dependencies from `0.1.2-alpha.2` to `0.1.2-alpha.3` (peer range unchanged at `>=0.1.0-rc.8 <0.2.0`), keep the `@deepseek-ai/cordis` / `@deepseek-ai/schemastery` carets aligned at `^4.0.2` / `^3.18.2`, and refresh the compatibility workflow targets, `dshWorkshop.compatibility.dshVersions`, and the five-language README version strings to `0.1.2-alpha.3`.
- Upgrade the `@deepseek-ai/dsh-*` dev dependencies to `0.1.2-alpha.2` (peer range unchanged at `>=0.1.0-rc.8 <0.2.0`) and align the `@deepseek-ai/cordis` / `@deepseek-ai/schemastery` dev dependency carets to `^4.0.2` / `^3.18.2`.
- Derive the test-only call-id brand locally from the dsh-tools execution contract (`ToolExecution['callId']` in `test/call-id.mjs`) instead of importing `CallId` from `@deepseek-ai/dsh-llm`, whose brand was renamed `ToolCallId` on host master: the tests stay green on both the published line and the checkout.

## [0.2.1] - 2026-08-30

### Fixed

- Gate the `translate/fix` audit append by the host's session-event vocabulary: hosts whose `KNOWN_SESSION_EVENT_TYPES` covers the type append plainly, hosts with the `ignorable` append envelope append with the marker, and envelope-less hosts (`0.1.0-rc.6`–`0.1.1-rc.2`, and `0.1.2-alpha.1`, which fails closed on unknown event types at read) get no append — so a JSON repair can never pollute the session log on the 0.1.2-alpha host line. The repair outcome never depends on the audit append.

## [0.2.0] - 2026-08-26

### Added

- Rosetta vendor mapping moved from code to a loadable JSON schema (`lib/rosetta-data.json`), overridable via `rosettaDataPath`.

### Changed

- Dependency updates flow through the shared dsh-plugin-kit Renovate preset.

## [0.1.3] - 2026-08-23

### Fixed

- Repair a corrupted em-dash in a `lib/fix.mjs` JSDoc comment (prose only; no behavior change).

## [0.1.2] - 2026-08-22

### Changed

- Upgrade the `@deepseek-ai/dsh-*` dev dependencies to `0.1.1-rc.2` (peer range unchanged at `>=0.1.0-rc.8 <0.2.0`); the seams verified against the rc.8 peers (two-argument `session.append`, `{kind: 'accept', value}` post-execute decision, `CommandInvocation` handler, `CommandResult` `{kind, text}`) are unchanged in rc.2.
- Declare compatibility with DeepSeek Harness `0.1.1-rc.2` in the READMEs, the package metadata, and the compat workflow.

## [0.1.1] - 2026-08-21

### Changed

- Upgrade the `@deepseek-ai/dsh-*` peer and dev dependencies to `0.1.0-rc.8` (peer range `>=0.1.0-rc.8 <0.2.0`); the seams verified against the rc.6 peers (two-argument `session.append`, `{kind: 'accept', value}` post-execute decision, `CommandResult` `{kind, text}`) are unchanged in rc.8.
- Declare compatibility with DeepSeek Harness `0.1.0-rc.8` in the READMEs and the package metadata.

## [0.1.0] - 2026-08-16

### Added

- Vendor parameter translation table (`lib/rosetta.mjs`): 11 vendors × 13 canonical parameters, ported from GPT-Rosetta-Stone (openai/ernie/qwen rows unchanged) and extended from public API references; `/translate` command with overview/vendors/params/pairwise subcommands.
- Deterministic JSON repair (`lib/fix.mjs`): markdown-fence extraction, escape repair, trailing-comma removal, truncation closure, and required-field completion with explicit `null` placeholders — never fabricating data.
- `tools/post-execute` repair listener for successful string canonical values from string-rooted or `json`-rooted output schemas (plus `repair.toolNames` opt-in), replacing the value only after the registry re-validates it.
- `fix_json` tool with bounded, sanitized diff output.
- `translate/fix` session audit event (counts and flags only, never payloads).
- Five-language READMEs, `cordis.patch.yml`, architecture and security docs.

### Security

- oneOf validation now carries a branch budget (`MAX_ONE_OF_BUDGET`) so hostile exponential schemas fail closed instead of exhausting the process.
