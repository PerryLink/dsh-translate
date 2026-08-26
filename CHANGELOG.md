# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
