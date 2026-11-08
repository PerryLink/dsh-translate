import test from 'node:test'
import assert from 'node:assert/strict'
import { latestRoute } from '../lib/service.mjs'

const header = (provider, model) => ({ type: 'request/header', data: { header: { config: { provider, model } } } })

test('config pair wins over sessions', () => {
  const route = latestRoute({
    config: { provider: 'p', model: 'm' },
    sessions: { list: () => [{ snapshotEvents: () => [header('s', 's')] }] },
  })
  assert.deepEqual(route, { provider: 'p', model: 'm', source: 'config' })
})

test('falls back to the newest request header', () => {
  const route = latestRoute({
    config: { provider: '', model: '' },
    sessions: {
      list: () => [
        { snapshotEvents: () => [header('old', 'old-model')] },
        { snapshotEvents: () => [header('new', 'new-model')] },
      ],
    },
  })
  assert.deepEqual(route, { provider: 'new', model: 'new-model', source: 'session' })
})

test('supports the legacy .events getter', () => {
  const route = latestRoute({
    config: {},
    sessions: { list: () => [{ events: [header('legacy', 'm')] }] },
  })
  assert.equal(route.provider, 'legacy')
})

test('returns undefined without a route', () => {
  assert.equal(latestRoute({ config: {}, sessions: { list: () => [] } }), undefined)
  assert.equal(latestRoute({ config: {}, sessions: undefined }), undefined)
})
