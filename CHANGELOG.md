# Changelog

## [0.3.0] - 2026-11-08

### Added

- **Full-page translation driven by the user's own model route.** The browser half walks the rendered DOM, masks code, paths, commands, identifiers, versions, hashes, numbers and product names into `⟦n⟧`, and sends the remaining prose to the `translatePage` Typert service; the host half resolves the route from the newest live `request/header` (or an explicit `provider`/`model` pair) and calls `ctx.llm.stream`.
- **Display-only by construction.** No session event, no workspace write, no on-disk translation cache: originals stay in memory, the floating control restores the page, and translations are cached in browser `localStorage` (600 entries).
- **Fail-closed merging.** A translation that loses, renumbers or invents a placeholder keeps its original text; a segment with no prose left is never sent. The render-layer mutation observer re-applies cached translations after React re-renders without calling the model again.
- **Bounded calls.** `maxSegments` (40), `maxChars` (6000) and `timeoutMs` (60000) bound every model call; the glossary keeps extra product names verbatim.
- Hand-written client bundle (no build step) with a Typert descriptor parity test, plus jsdom coverage for the DOM engine.

### Known limits

- Render-layer translation can flicker when React re-renders a node; streaming text is translated after a 350 ms quiet period.
- Images, Canvas and PDF previews are not OCR'd; hidden elements are translated when they become visible.
