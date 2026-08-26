/**
 * Data-driven rosetta table: the bundled JSON round-trips through validation,
 * an external snapshot can swap the table in place, and invalid overrides fail
 * loud without corrupting the previous table.
 * @module dsh-translate/test/rosetta-data.test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  loadRosettaData,
  rosettaData,
  validateRosettaData,
  vendorIds,
  paramList,
} from '../lib/rosetta.mjs'

const BUNDLED_PATH = fileURLToPath(new URL('../lib/rosetta-data.json', import.meta.url))

test('bundled rosetta-data.json round-trips through validateRosettaData', () => {
  const data = JSON.parse(readFileSync(BUNDLED_PATH, 'utf8'))
  const validated = validateRosettaData(data)
  assert.equal(validated.vendors.length, 11)
  assert.equal(validated.params.length, 13)
  assert.ok(Object.hasOwn(validated.table.model, 'openai'))
})

test('loadRosettaData swaps the table in place and restores the bundled snapshot', () => {
  const original = rosettaData()
  try {
    const snapshot = loadRosettaData({
      version: 1,
      vendors: [{ id: 'openai', name: 'OpenAI', apiStyle: 'openai', source: 'ported' }],
      params: ['model'],
      table: { model: { openai: { name: 'model', supported: true, source: 'ported' } } },
    })
    assert.deepEqual(vendorIds(), ['openai'])
    assert.deepEqual(paramList(), ['model'])
    assert.equal(snapshot.vendors.length, 1)
  } finally {
    loadRosettaData(original)
  }
  assert.equal(vendorIds().length, 11)
  assert.equal(paramList().length, 13)
})

test('loadRosettaData rejects a table missing one vendor cell', () => {
  assert.throws(() => loadRosettaData({
    version: 1,
    vendors: [{ id: 'openai', name: 'OpenAI', apiStyle: 'openai', source: 'ported' }],
    params: ['model'],
    table: { model: {} },
  }), /supported flag/u)
})

test('loadRosettaData rejects an empty vendors array', () => {
  assert.throws(() => loadRosettaData({ version: 1, vendors: [], params: ['model'], table: {} }), /non-empty array/u)
})
