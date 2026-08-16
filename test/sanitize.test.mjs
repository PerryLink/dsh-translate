/**
 * lib/sanitize.mjs extreme cases: bounded fragments, hostile payloads, and
 * the truncation flags consumers rely on to never mistake a bounded diff for
 * a complete one.
 * @module dsh-translate/test/sanitize.test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeText, sanitizeDiff } from '../lib/sanitize.mjs'

test('sanitizeText bounds long strings with an ellipsis inside the cap', () => {
  const bounded = sanitizeText('x'.repeat(1_000), 10)
  assert.equal(bounded.length, 10)
  assert.ok(bounded.endsWith('\u2026'))
})

test('sanitizeText is total on hostile inputs', () => {
  assert.equal(sanitizeText('lone \uD800 surrogate', 100), 'lone \uD800 surrogate')
  assert.equal(sanitizeText({ deep: { value: 1 } }, 100), '{"deep":{"value":1}}')
  assert.equal(sanitizeText(undefined, 100), 'undefined')
  assert.equal(sanitizeText('short', 100), 'short')
  assert.equal(sanitizeText('x', 0), '')
  assert.equal(sanitizeText('x', NaN), '')
})

test('sanitizeText stringifies circular values without throwing', () => {
  const circular = {}
  circular.self = circular
  assert.equal(sanitizeText(circular, 100), String(circular))
})

test('sanitizeDiff bounds entries and fragments and reports truncation', () => {
  const diff = Array.from({ length: 60 }, (_, index) => ({
    op: 'escape',
    path: `text@${index}`,
    before: 'x'.repeat(300),
    after: 'y',
  }))
  const result = sanitizeDiff(diff, { maxChars: 20, maxEntries: 50 })
  assert.equal(result.entries.length, 50)
  assert.equal(result.truncated, true)
  for (const entry of /** @type {{ before: string }[]} */ (result.entries)) {
    assert.ok(entry.before.length <= 20)
  }
})

test('sanitizeDiff is total on non-diff input', () => {
  const result = sanitizeDiff('nope', { maxChars: 20, maxEntries: 50 })
  assert.deepEqual(result, { truncated: false, entries: [] })
  const partial = sanitizeDiff([{ op: 'close', path: undefined, before: undefined, after: '' }])
  const first = /** @type {{ op: string, path: string }} */ (partial.entries[0])
  assert.equal(partial.entries.length, 1)
  assert.equal(first.op, 'close')
  assert.equal(first.path, '')
})
