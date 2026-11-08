import test from 'node:test'
import assert from 'node:assert/strict'
import { INVOCATIONS } from '../lib/wire.mjs'
import { loadClient } from './helpers.mjs'

const client = await loadClient()

test('client and host descriptors never drift', () => {
  const host = INVOCATIONS.map((descriptor) => ({
    id: descriptor.id,
    method: descriptor.method,
    parameters: descriptor.parameters.map((parameter) => parameter.name),
    result: descriptor.result.typeSymbol,
  }))
  const remote = client.__test.INVOCATIONS.map((descriptor) => ({
    id: descriptor.id,
    method: descriptor.method,
    parameters: descriptor.parameters.map((parameter) => parameter.name),
    result: descriptor.result.typeSymbol,
  }))
  assert.deepEqual(remote, host)
})
