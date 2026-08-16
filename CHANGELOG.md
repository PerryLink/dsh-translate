# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
