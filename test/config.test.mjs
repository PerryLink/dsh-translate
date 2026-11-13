import test from 'node:test'
import assert from 'node:assert/strict'
import { Config, resolveConfig } from '../index.mjs'

test('thinking effort defaults to off in the Schemastery schema', () => {
  assert.equal(Config({}).reasoningEffort, 'off')
  assert.equal(Config({ reasoningEffort: 'max' }).reasoningEffort, 'max')
  assert.throws(() => Config({ reasoningEffort: 'none' }))
})

test('resolveConfig defaults to off and accepts every host effort', () => {
  assert.equal(resolveConfig({}).reasoningEffort, 'off')
  assert.equal(resolveConfig(undefined).reasoningEffort, 'off')
  for (const effort of ['off', 'low', 'high', 'max']) {
    assert.equal(resolveConfig({ reasoningEffort: effort }).reasoningEffort, effort)
  }
})

test('resolveConfig rejects an unknown effort loudly', () => {
  assert.throws(() => resolveConfig({ reasoningEffort: 'none' }), /config\.reasoningEffort/)
  assert.throws(() => resolveConfig({ reasoningEffort: '' }), /config\.reasoningEffort/)
})
