<div align="center">

# 🔁 dsh-translate
- **1024 store channel**: `npm i -g dsh1024` once, then `dsh1024 plugin --profile web add dsh-translate` (counts toward the [deepseek1024.com](https://deepseek1024.com) install ranking).
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-translate)

**Vendor parameter translation and deterministic JSON repair for DeepSeek Harness.**

*Same request, every vendor. Broken JSON, fixed without inventing data.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-translate/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-translate/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-translate?label=version)](https://github.com/PerryLink/dsh-translate/releases)
[![npm version](https://img.shields.io/npm/v/dsh-translate)](https://www.npmjs.com/package/dsh-translate)
[![npm downloads](https://img.shields.io/npm/dm/dsh-translate)](https://www.npmjs.com/package/dsh-translate)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

| Surface | Status |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Form | Pure-host JS plugin (no browser half) |
| Model | Any model — repair is deterministic, no extra model calls |

## What you get

Two independent surfaces, one bundle:

- **`/translate`** — the vendor parameter translation table: `temperature`, `top_p`, `max_tokens`, `stop`, `system`, and 8 more canonical parameters mapped across **11 vendors** (OpenAI, ERNIE, Qwen, Anthropic, Google, DeepSeek, Mistral, Cohere, xAI, Groq, Azure). Ask for a pairwise mapping, list vendors/params, or convert a whole standard request (`transformRequest` in `lib/rosetta.mjs`).
- **The repair layer** — a `tools/post-execute` listener plus the `fix_json` tool. When a successful tool result carries broken JSON as a string (string-rooted or `json`-rooted output schema, or a tool opted in by name), the layer repairs it deterministically: markdown-fence extraction, escape repair, trailing-comma removal, truncation closure, and required-field completion with explicit `null` placeholders. **No value is ever invented** — a result that still violates the schema fails closed, and failed tool results are never flipped into successes.

```text
tool result (success, JSON text) ──▶ extract fence ──▶ parse
    │ ok? ──▶ schema-validate ──▶ accept { kind: 'accept', value }  (registry re-validates + re-renders)
    │ broken ──▶ escape / trailing-comma / close / fill-null ──▶ validate
    │ unrepairable ──▶ next()  (original value preserved) + translate/fix audit (counts only)
```

## Quick start

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add "github:PerryLink/dsh-translate#main"

# or from npm (published releases)
dsh plugin --profile web add dsh-translate

# 2. restart and verify the row
dsh --profile web --dump-config | grep -A2 'id: dsh-translate'
```

Then ask the agent to check a mapping or repair a payload:

```
> /translate openai ernie max_tokens
> Use fix_json to repair: {"a": 1,} against {"type":"object","properties":{"a":{"type":"integer"}},"required":["a"]}
```

## Install & uninstall

- **git channel** (latest `main`): `dsh plugin --profile web add "github:PerryLink/dsh-translate#main"` — pure JS, no build step.
- **npm channel** (published releases): `dsh plugin --profile web add dsh-translate`.
- **tarball channel**: `pnpm pack` in this repo, then `dsh plugin --profile web add ./dsh-translate-<version>.tgz`.
- **uninstall**: `dsh plugin --profile web remove dsh-translate` (or remove the row from the profile patch).

## Configuration

All tunables are Schemastery `Config` fields (changeable from cordis.yml). An id-targeted override replaces the whole row — restate every key you need. `cordis.patch.yml` documents each key inline.

| Key | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Master switch; `false` registers nothing |
| `repair.enabled` | `true` | Post-execute repair layer switch |
| `repair.toolNames` | `[]` | Extra tool names whose JSON-text results may be repaired (on top of string-rooted / `json`-rooted schemas) |
| `repair.strategies.escapeRepair` | `true` | Escape raw control characters inside strings |
| `repair.strategies.trailingComma` | `true` | Remove commas directly before a closing bracket |
| `repair.strategies.truncationClosure` | `true` | Close an unclosed string or container cut off by truncation |
| `repair.strategies.fieldCompletion` | `true` | Complete missing required fields with explicit `null` placeholders |
| `repair.maxSteps` | `8` | Strategy application budget (repair-loop passes, 1..64) |
| `diffMaxChars` | `200` | Cap on one logged diff fragment, in characters |
| `diffMaxEntries` | `50` | Cap on logged diff entries |
| `registerCommand` | `true` | Register the `/translate` command |
| `registerTool` | `true` | Register the `fix_json` tool |
| `rosettaDataPath` | *(none)* | Optional external rosetta data file (same shape as the bundled `lib/rosetta-data.json`); overrides the built-in mapping table |

Example override in your profile patch:

```yaml
- insert:
    - id: dsh-translate
      name: dsh-translate
      config:
        enabled: true
        repair:
          enabled: true
          toolNames: ['emit-json']
          strategies:
            escapeRepair: true
            trailingComma: true
            truncationClosure: true
            fieldCompletion: true
          maxSteps: 8
        diffMaxChars: 200
        diffMaxEntries: 50
        registerCommand: true
        registerTool: true
```

## Tools & surfaces

| Surface | Kind | Notes |
|---|---|---|
| `/translate` | command | `vendors`, `params`, or `<from> <to> [param]` pairwise mapping |
| `fix_json` | tool | `{ text, schema?, strategies? }` → `{ ok, repaired?, diff?, strategies, truncated, validated, error? }`; diff fragments are bounded and sanitized |
| post-execute repair | listener | Automatic for successful string results from string-rooted / `json`-rooted schemas (plus `repair.toolNames`); always calls `next()` unless it claims the call |

## Permissions & data

- **Permissions**: no network, no subprocess, no credentials — the plugin only consumes the official `commands` and `tools` services and appends to the session log.
- **Data**: repair never fabricates values; the only model-visible additions are the repaired canonical value and the `fix_json` diff. Session audit events (`translate/fix`) carry tool name, call id, strategy names, edit counts, and truncation flags — never payloads.

## Security boundaries

- **Deterministic only.** Repair is bounded text surgery; the upstream LLM-retry arm of JSON-Schema-Enforcer-Proxy was deliberately not ported — a post-execute listener never calls a model.
- **Fail closed.** Unrepairable syntax and schema violations leave the original result untouched (or return a structured error from `fix_json`); `null` placeholders only land when the schema accepts `null`.
- **Hostile input bounded.** Unsupported schema keywords and circular schemas are rejected; `oneOf` validation is capped by depth (`MAX_ONE_OF_DEPTH`) and a branch budget (`MAX_ONE_OF_BUDGET`), so an exponential schema cannot exhaust the process.
- **No payload leakage.** Logs and audit events never contain repaired payloads; diffs are truncated and capped before display or storage.

## Known limitations

- The supported JSON Schema subset mirrors the harness tool registry (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const`); other keywords are rejected as unsupported, not silently ignored.
- Repair only applies to successful results whose canonical value is a JSON-text string; a value that already failed schema validation arrives as a failed result and is never flipped.
- The translation table covers 11 vendors × 13 canonical parameters; `extended` rows follow public API references (not the upstream trio) and are marked as such in `lib/rosetta.mjs`.

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm test           # node --test: 70 tests (pure lib suites + real-service assembly suite)
pnpm run check      # tsc checkJs against types.d.ts
pnpm run verify:self-contained  # dependency specs resolve from the registry
pnpm run verify:artifacts       # ESM face imports under plain Node + lib exports present
node scripts/check-readme-sync.mjs  # five-language README sync gate (also in CI)
pnpm pack           # the published tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `json-repair`, `schema-validation`, `parameter-mapping`, `llm-api`, `tooling`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creator and maintainer: translation table and repair pipeline ports, plugin surfaces, tests, and the five-language docs.

## PerryLink DSH Plugin Family

This project is one of the [33 DeepSeek Harness plugins](https://github.com/PerryLink) maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-translate contributors
