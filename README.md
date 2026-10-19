<div align="center">

# 🔁 dsh-translate
- **1024 store channel**: `npm i -g dsh1024` once, then `dsh1024 plugin --profile web add dsh-translate` (counts toward the [deepseek1024.com](https://deepseek1024.com) install ranking).
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-translate)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-translate?metric=downloads)](https://dshfind.com/plugins/PerryLink/dsh-translate?ref=badge)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/PerryLink/dsh-translate/badge)](https://api.securityscorecards.dev/projects/github.com/PerryLink/dsh-translate)

**Vendor parameter translation and deterministic JSON repair for DeepSeek Harness.**

*Same request, every vendor. Broken JSON, fixed without inventing data.*

**This is a vendor parameter mapping table, not machine translation.**

> **Official repository.** This is the only official repository of dsh-translate, maintained by PerryLink. Same-name repositories under other accounts are not affiliated.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-translate.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-translate/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-translate/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-translate?label=version)](https://github.com/PerryLink/dsh-translate/releases)
[![npm version](https://img.shields.io/npm/v/dsh-translate)](https://www.npmjs.com/package/dsh-translate)
[![npm downloads](https://img.shields.io/npm/dm/dsh-translate)](https://www.npmjs.com/package/dsh-translate)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-translate
```


</div>

---

**📖 Ecosystem knowledge base** — measured data, not marketing: [plugin development guide · plugin-selection data · maintenance criteria](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Install & uninstall

- **git channel** (latest `main`): `dsh plugin --profile web add github:PerryLink/dsh-translate` — pure JS, no build step.
- **npm channel** (published releases): `dsh plugin --profile web add dsh-translate`.
- **tarball channel**: `pnpm pack` in this repo, then `dsh plugin --profile web add ./dsh-translate-<version>.tgz`.
- **uninstall**: `dsh plugin --profile web remove dsh-translate` (or remove the row from the profile patch).

## ⭐ 如果它帮到了你

这个插件是 [DSH 插件家族](https://github.com/PerryLink)的一员（95 个，全部 Apache-2.0）。如果你在用，**给个 star** —— 它不会解锁任何功能，但会让下一个人在搜索里更容易找到它。

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.


## What is dsh-translate?

Vendor parameter translation and deterministic JSON repair for DeepSeek Harness.

Same request, every vendor. Broken JSON, fixed without inventing data.

![Terminal demo of dsh-translate: dsh-translate — /translate openai ernie max_tokens](https://raw.githubusercontent.com/PerryLink/dsh-translate/main/docs/assets/dsh-translate-hero.png)

![Animated terminal demo of dsh-translate](https://raw.githubusercontent.com/PerryLink/dsh-translate/main/docs/assets/dsh-translate-demo.gif)

*The same run, animated.*

## Compatibility

| Surface | Status |
|---|---|
| Harness | Main version **`dsh-v0.2.1-alpha.1`** (verified 2026-09-25: dual typecheck rulers + `node --test` 80/80 + self-contained/artifacts gates). npm dev/test pins now `0.1.7-rc.2`; peers `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0`. |
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
dsh plugin --profile web add github:PerryLink/dsh-translate
```

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add github:PerryLink/dsh-translate

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
- **Data**: repair never fabricates values; the only model-visible additions are the repaired canonical value and the `fix_json` diff. Session audit events (`translate/fix`) carry tool name, call id, strategy names, edit counts, and truncation flags — never payloads. The audit write is gated by the host’s session-event vocabulary: a host that knows `translate/fix` gets the plain two-argument append, and a host with the `ignorable` append envelope gets the marked append. **On 0.1.6+ and 0.2.x the private `translate/fix` type is not in the host vocabulary, so no audit event is written**; the tool result remains the model-visible log. This is an observability limitation, not a data-plane change.

## Security boundaries

- **Deterministic only.** Repair is bounded text surgery; the upstream LLM-retry arm of JSON-Schema-Enforcer-Proxy was deliberately not ported — a post-execute listener never calls a model.
- **Fail closed.** Unrepairable syntax and schema violations leave the original result untouched (or return a structured error from `fix_json`); `null` placeholders only land when the schema accepts `null`.
- **Hostile input bounded.** Unsupported schema keywords and circular schemas are rejected; `oneOf` validation is capped by depth (`MAX_ONE_OF_DEPTH`) and a branch budget (`MAX_ONE_OF_BUDGET`), so an exponential schema cannot exhaust the process.
- **No payload leakage.** Logs and audit events never contain repaired payloads; diffs are truncated and capped before display or storage.

## Known limitations

- The supported JSON Schema subset mirrors the harness tool registry (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const`); other keywords are rejected as unsupported, not silently ignored.
- Repair only applies to successful results whose canonical value is a JSON-text string; a value that already failed schema validation arrives as a failed result and is never flipped.
- The translation table covers 11 vendors × 13 canonical parameters; `extended` rows follow public API references (not the upstream trio) and are marked as such in `lib/rosetta.mjs`.
- On hosts that neither know `translate/fix` nor expose the `ignorable` append envelope — including `0.1.6+` and `0.2.x`, whose private-type vocabulary does not contain it — the adaptive gate skips the audit append so the session log is never polluted; the tool result remains the durable evidence until the event type is registered.

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm test           # node --test: 79 tests (pure lib suites + real-service assembly suite)
pnpm run check      # tsc checkJs against types.d.ts
pnpm run verify:self-contained  # dependency specs resolve from the registry
pnpm run verify:artifacts       # ESM face imports under plain Node + lib exports present
node scripts/check-readme-sync.mjs  # five-language README sync gate (also in CI)
pnpm pack           # the published tarball
```

## Interoperability with other DSH plugins

Verified against **DSH `0.2.0-rc.2`** (the runtime this README ships for) and the high-star plugin set surveyed on 2026-10-05.

This plugin **does not interfere** with other plugins, including the widely installed high-star ones:

- **No tool-name collision.** Every tool is namespaced; no bare name owned by a shipped tool or another plugin is registered.
- **No service-key collision.** It provides no service key at all, so it cannot collide on one.
- **No slot collision.** It registers no client slot key, so it cannot contend for a `shadows-shipped-ui` seat.
- **No HTTP route collision.** It registers no `webServer` prefix.
- **No patch-layer collision.** The bundle patch only `insert`s its own row; it never overrides a built-in row's `config`.
- **No global mutation.** It does not patch prototypes, rewrite `process.env`, or replace the global fetch dispatcher.

**Shared event listeners are non-interfering by construction.** It observes the ordering-sensitive event `tools/post-execute` with `ctx.on()` — Cordis's broadcast registration, where every listener runs and none can starve another. **Every listener here delegates through `next()`**, so the chain is never short-circuited, and a mutation is applied to the value `next()` produced rather than returned in its place:
  - `tools/post-execute` — also used by `cc-safety-net` (1576★).

Static evidence: `dsh-plugin-doctor` K10–K13 report `pass` for every check on this repository.

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `json-repair`, `schema-validation`, `parameter-mapping`, `llm-api`, `tooling`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creator and maintainer: translation table and repair pipeline ports, plugin surfaces, tests, and the five-language docs.

## PerryLink DSH Plugin Family

This project is part of the DeepSeek Harness plugin family from [PerryLink](https://github.com/PerryLink). The roster stays collapsed below so every README keeps a short first screen; expand it to see every row and its status.

<details>
<summary>Expand all plugins</summary>

| Plugin | Status |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 FROZEN — see the repo README |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 FROZEN — see the repo README |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 FROZEN — see the repo README |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 FROZEN — see the repo README |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 FROZEN — see the repo README |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRED — see the repo README |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRED — see the repo README |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRED — see the repo README |

</details>## License

[Apache License 2.0](LICENSE) © 2026 dsh-translate contributors
