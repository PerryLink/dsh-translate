/**
 * lib/rosetta.mjs regression suite: the upstream GPT-Rosetta-Stone adapter
 * and mapping tests converted to JS, plus the extended-row behavior contract.
 * @module dsh-translate/test/rosetta.test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  vendorIds,
  paramList,
  describeVendor,
  describeParam,
  translate,
  transformRequest,
  VENDORS,
  TABLE,
} from '../lib/rosetta.mjs'

test('vendorIds lists the three ported vendors first, in upstream order', () => {
  const ids = vendorIds()
  assert.deepEqual(ids.slice(0, 3), ['openai', 'ernie', 'qwen'])
  assert.ok(ids.includes('deepseek'))
  assert.equal(ids.length, 11)
})

test('paramList carries the canonical vocabulary', () => {
  const params = paramList()
  for (const expected of ['model', 'temperature', 'top_p', 'max_tokens', 'stop', 'system']) {
    assert.ok(params.includes(expected))
  }
  assert.equal(params.length, 13)
})

test('describeVendor is case-insensitive and rejects unknown ids', () => {
  assert.equal(describeVendor('ERNIE')?.id, 'ernie')
  assert.equal(describeVendor('OpenAI')?.name, 'OpenAI')
  assert.equal(describeVendor('nope'), undefined)
})

test('describeParam returns the upstream ported rows unchanged', () => {
  // Upstream ERNIE mapping: temperature clamps to [0.01, 1.0].
  const row = describeParam('temperature', 'ernie')
  assert.equal(row?.name, 'temperature')
  assert.deepEqual(row?.transform, { kind: 'clamp', min: 0.01, max: 1.0 })
  assert.equal(row?.source, 'ported')
})

test('translate reports unknown vendors and parameters as errors, never guesses', () => {
  const unknownFrom = translate('nope', 'openai')
  assert.ok('error' in unknownFrom)
  assert.match(unknownFrom.error, /unknown vendor "nope"/u)
  const unknownTo = translate('openai', 'nope')
  assert.ok('error' in unknownTo)
  assert.match(unknownTo.error, /unknown vendor "nope"/u)
  const unknownParam = translate('openai', 'ernie', 'nope')
  assert.ok('error' in unknownParam)
  assert.match(unknownParam.error, /unknown parameter "nope"/u)
})

test('translate maps max_tokens across the ported trio', () => {
  const result = translate('openai', 'ernie', 'max_tokens')
  assert.ok(!('error' in result))
  const rows = /** @type {{ param: string, from: { name: unknown, supported: unknown }, to: { name: unknown, supported: unknown } }[]} */ (result.rows)
  const row = rows[0]
  assert.equal(row?.from.name, 'max_tokens')
  assert.equal(row?.to.name, 'max_output_tokens')
})

test('translate without a param returns every canonical row', () => {
  const result = translate('openai', 'qwen')
  assert.ok(!('error' in result))
  const rows = /** @type {{ param: string, from: { name: unknown, supported: unknown }, to: { name: unknown, supported: unknown } }[]} */ (result.rows)
  assert.equal(rows.length, 13)
  const stop = rows.find((/** @type {{ param: string }} */ row) => row.param === 'stop')
  assert.equal(stop?.to.supported, false)
})

test('transformRequest maps supported parameters and drops unsupported ones with warnings', () => {
  const { result, warnings } = transformRequest(
    { model: 'gpt-x', temperature: 0.7, top_p: 0.9, max_tokens: 512, stop: ['END'], stream: true },
    'ernie',
  )
  assert.equal(result.model, 'gpt-x')
  assert.equal(result.temperature, 0.7)
  assert.equal(result.top_p, 0.9)
  assert.equal(result.max_output_tokens, 512)
  assert.equal(result.stream, true)
  assert.ok(!Object.hasOwn(result, 'stop'))
  assert.ok(warnings.some(warning => warning.includes('stop')))
})

test('transformRequest applies the ERNIE temperature clamp', () => {
  const { result } = transformRequest({ temperature: 2 }, 'ernie')
  assert.equal(result.temperature, 1.0)
  const below = transformRequest({ temperature: 0 }, 'ernie')
  assert.equal(below.result.temperature, 0.01)
})

test('transformRequest ignores unknown request fields', () => {
  const { result } = transformRequest({ temperature: 1, madeUpField: 'x' }, 'openai')
  assert.deepEqual(result, { temperature: 1 })
})

test('transformRequest throws for an unknown vendor, like the upstream UnsupportedProviderError', () => {
  assert.throws(() => transformRequest({}, 'nope'), /unsupported provider: nope/u)
})

test('upstream-ported rows keep their source markers; extended rows are separate', () => {
  // The rows the upstream table defines stay `ported`; rows added beyond the
  // upstream trio are `extended` (per lib/rosetta.mjs header contract).
  for (const param of ['model', 'messages', 'temperature', 'top_p', 'max_tokens', 'stream']) {
    for (const vendor of ['openai', 'ernie', 'qwen']) {
      assert.equal(TABLE[param][vendor].source, 'ported')
    }
  }
  for (const vendor of ['openai', 'ernie', 'qwen']) {
    assert.equal(TABLE['system'][vendor].source, 'extended')
  }
  assert.equal(VENDORS.filter(vendor => vendor.source === 'ported').length, 3)
})
