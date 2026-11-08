import test from 'node:test'
import assert from 'node:assert/strict'
import { batchSegments, parseArrayAnswer, placeholdersIntact, translateSegments } from '../lib/engine.mjs'
import { fakeAssembler, fakeLlm } from './helpers.mjs'

test('placeholder multiset must match', () => {
  assert.equal(placeholdersIntact('⟦0⟧ a ⟦1⟧', 'x ⟦1⟧ y ⟦0⟧'), true)
  assert.equal(placeholdersIntact('⟦0⟧ a', 'x'), false)
  assert.equal(placeholdersIntact('⟦0⟧ a ⟦1⟧', '⟦0⟧ a ⟦0⟧'), false)
})

test('batches respect count and characters', () => {
  const batches = batchSegments(['aa', 'bb', 'cc', 'dd'], 2, 1000)
  assert.deepEqual(batches.map((batch) => batch.items), [['aa', 'bb'], ['cc', 'dd']])
  const byChars = batchSegments(['aaaa', 'bbbb'], 10, 5)
  assert.deepEqual(byChars.map((batch) => batch.items), [['aaaa'], ['bbbb']])
})

test('parses arrays out of fences and prose', () => {
  assert.deepEqual(parseArrayAnswer('```json\n["a"]\n```'), ['a'])
  assert.deepEqual(parseArrayAnswer('result: ["a", "b"] done'), ['a', 'b'])
  assert.equal(parseArrayAnswer('no array here'), undefined)
})

test('translates every segment and keeps placeholders', async () => {
  const llm = fakeLlm([['翻译 ⟦0⟧', '第二段']])
  const result = await translateSegments({
    llm, route: { provider: 'deepseek', model: 'm' }, targetLang: 'zh',
    segments: ['translate ⟦0⟧', 'second'], assembler: fakeAssembler, timeoutMs: 5000,
    maxSegments: 10, maxChars: 1000,
  })
  assert.deepEqual(result.translations, ['翻译 ⟦0⟧', '第二段'])
  assert.deepEqual(result.failed, [])
  assert.equal(result.error, null)
  assert.equal(llm.calls.length, 1)
})

test('falls back to the original when a placeholder is lost', async () => {
  const llm = fakeLlm([['翻译（丢了占位符）', '第二段']])
  const result = await translateSegments({
    llm, route: { provider: 'deepseek', model: 'm' }, targetLang: 'zh',
    segments: ['translate ⟦0⟧', 'second'], assembler: fakeAssembler, timeoutMs: 5000,
  })
  assert.deepEqual(result.failed, [0, 1])
  assert.deepEqual(result.translations, ['translate ⟦0⟧', 'second'])
  assert.match(result.error, /placeholder/)
})

test('splits into multiple model calls', async () => {
  const llm = fakeLlm([['一', '二'], ['三']])
  const result = await translateSegments({
    llm, route: { provider: 'deepseek', model: 'm' }, targetLang: 'zh',
    segments: ['one', 'two', 'three'], assembler: fakeAssembler, timeoutMs: 5000,
    maxSegments: 2, maxChars: 1000,
  })
  assert.equal(llm.calls.length, 2)
  assert.deepEqual(result.translations, ['一', '二', '三'])
})

test('a stream error fails closed', async () => {
  const llm = { async *stream() { throw new Error('network down') } }
  const result = await translateSegments({
    llm, route: { provider: 'deepseek', model: 'm' }, targetLang: 'zh',
    segments: ['one'], assembler: fakeAssembler, timeoutMs: 5000,
  })
  assert.deepEqual(result.translations, ['one'])
  assert.deepEqual(result.failed, [0])
  assert.match(result.error, /network down/)
})
