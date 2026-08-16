# ARCHITECTURE

`dsh-translate` is a pure-host JS plugin with two independent surfaces that
share two pure data/function libraries. There is no state beyond what Cordis
owns, no I/O, and no network access.

```
                        ┌──────────────────────────────────────────────┐
                        │ index.mjs (the only host face)               │
                        │  name / inject: ['commands', 'tools']        │
                        └───────┬───────────────────────┬──────────────┘
                /translate cmd │                       │
                fix_json tool  │                       │ tools/post-execute listener
                        ┌──────▼───────────┐    ┌──────▼──────────────────┐
                        │ lib/rosetta.mjs  │    │ lib/fix.mjs             │
                        │ vendor/parameter │    │ extract → parse →       │
                        │ translation table│    │ escape/trailing/close/  │
                        │ (pure data)      │    │ fill → validate         │
                        └──────────────────┘    └──────┬──────────────────┘
                                                       │ sanitizeDiff
                                                ┌──────▼──────────────────┐
                                                │ lib/sanitize.mjs       │
                                                │ bounded diff fragments │
                                                └─────────────────────────┘
```

## The repair pipeline (tools/post-execute)

The repair layer is a **post-execute repair**, not a validator: the tool
registry already validates every canonical value against the tool's declared
`output.schema` before post-execute runs, so a value that violates the schema
arrives as a FAILED result — and failures are never flipped into successes
here. The reachable, repairable case is a successful result whose canonical
value is a **string carrying JSON text** (the schema root is string-rooted or
unconstrained `json`-rooted, or the tool is opted in through
`repair.toolNames`).

1. `extractJsonFromText` removes a markdown fence; non-JSON prose is left
   untouched (`next()`).
2. If the text already parses and validates, nothing is claimed.
3. Otherwise `repairJsonText` runs the deterministic strategy loop
   (`maxSteps` passes): `escapeRepair` (raw control characters in strings),
   `trailingComma` (commas before closers), `truncationClosure` (unclosed
   string/containers from truncation), then `fieldCompletion` (missing
   `required` fields filled with explicit `null` — a placeholder, never
   invented data).
4. The repaired value must parse and, when the schema declares constraints,
   validate; otherwise the result stays untouched (`next()`, audit
   `unrepairable`).
5. On success the listener returns `{ kind: 'accept', value }`: container
   schemas receive the parsed object, string roots receive the repaired text;
   the registry re-validates and re-renders the replacement. The
   `translate/fix` session event records only tool name, call id, applied
   strategies, edit count, and truncation flags — never payloads.

The same pipeline powers `fix_json`, the explicit tool: the model hands over
`{ text, schema?, strategies? }` and receives `{ ok, repaired?, diff?,
strategies, truncated, validated, error? }` with the diff bounded by
`sanitizeDiff` (`diffMaxChars` / `diffMaxEntries`).

## The /translate command

`lib/rosetta.mjs` is the data-driven port of GPT-Rosetta-Stone: one canonical
parameter vocabulary (13 params) × 11 vendors. Rows marked `source: 'ported'`
come from the upstream table; `extended` rows add vendors from public API
references and are documented as such. The command surface is three pure text
helpers (`translateOverview`, `translateVendorList`, `translateParamList`,
`translatePair`) shared by the handler, so unit tests cover every output
without a UI dispatch.

## Relationship to the official tool pipeline

- Schema **validation** is the official registry's job; this plugin only
  **repairs after the fact** and never substitutes for the registry.
- Parameter translation is a lookup table, not a model-routing adapter.
- Nothing is injected into the model context; `translate/fix` is log-only.
