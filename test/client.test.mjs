import test from 'node:test'
import assert from 'node:assert/strict'
import { loadClient } from './helpers.mjs'

const client = await loadClient()
const { protectText, restoreText } = client.__test

test('protects commands, paths and file names', () => {
  const source = 'Run `npm test` in /repo/src then read README.md'
  const result = protectText(source, [])
  assert.ok(result !== null)
  assert.equal(result.slots.length, 3)
  assert.ok(result.masked.includes('⟦0⟧'))
  assert.equal(restoreText(result.masked, result.slots), source)
})

test('protects product names verbatim', () => {
  const result = protectText('DeepSeek Harness uses Cordis', [])
  assert.ok(result !== null)
  assert.equal(restoreText(result.masked, result.slots), 'DeepSeek Harness uses Cordis')
  assert.equal(result.masked.replace(/⟦\d+⟧/g, 'X'), 'X uses X')
})

test('keeps numbers, versions and identifiers', () => {
  const source = 'Set max_tokens=4096 and retry 3 times on v0.2.1-rc.1'
  const result = protectText(source, [])
  assert.ok(result !== null)
  assert.match(result.masked, /⟦\d+⟧/)
  assert.equal(restoreText(result.masked, result.slots), source)
})

test('returns null when there is no prose left', () => {
  assert.equal(protectText('`npm test`', []), null)
  assert.equal(protectText('/only/a/path', []), null)
  assert.equal(protectText('12345', []), null)
})

test('rejects translations that drop or invent placeholders', () => {
  assert.equal(restoreText('⟦0⟧ only', ['a', 'b']), null)
  assert.equal(restoreText('⟦0⟧ and ⟦9⟧', ['a']), null)
  assert.equal(restoreText('⟦0⟧ x', ['a']), 'a x')
})

test('honours an extra glossary term', () => {
  const result = protectText('Use Acme Widgets here', ['Acme Widgets'])
  assert.ok(result !== null)
  assert.equal(result.masked, 'Use ⟦0⟧ here')
})
