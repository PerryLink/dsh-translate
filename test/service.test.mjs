import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { latestRoute, TranslateService } from '../lib/service.mjs'

/** A resolved config shaped like `resolveConfig` output. */
function config(overrides = {}) {
  return {
    enabled: true,
    targetLang: 'zh',
    provider: 'deepseek',
    model: 'm',
    maxSegments: 40,
    maxChars: 6000,
    timeoutMs: 5000,
    reasoningEffort: 'off',
    glossary: [],
    ...overrides,
  }
}

/** An llm service that records every request and answers one segment. */
function fakeLlm() {
  return {
    calls: [],
    async *stream(request) {
      this.calls.push(request)
      yield { type: 'text-delta', text: JSON.stringify(['你好']) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}

/** Mount the service on a throwaway context; the route is pinned by config. */
function service(overrides) {
  const llm = fakeLlm()
  const instance = new TranslateService(new Context(), {
    config: config(overrides),
    sessions: { list: () => [] },
    getLlm: () => llm,
  })
  return { llm, instance }
}

test('translate() sends the configured effort, off by default', async () => {
  const off = service()
  const offResult = await off.instance.translate({ targetLang: 'zh', segments: ['hello'] })
  assert.equal(offResult.error, null)
  assert.deepEqual(offResult.translations, ['你好'])
  assert.equal(off.llm.calls[0].reasoningEffort, 'off')

  const high = service({ reasoningEffort: 'high' })
  await high.instance.translate({ targetLang: 'zh', segments: ['hello'] })
  assert.equal(high.llm.calls[0].reasoningEffort, 'high')
})

test('a config without reasoningEffort still never falls back to thinking', async () => {
  const { llm, instance } = service({ reasoningEffort: undefined })
  await instance.translate({ targetLang: 'zh', segments: ['hello'] })
  assert.equal(llm.calls[0].reasoningEffort, 'off')
})

test('the session header contributes the route, never the effort', () => {
  const sessions = {
    list: () => [{
      snapshotEvents: () => [{
        type: 'request/header',
        data: { header: { config: { provider: 'session', model: 'session-model', reasoningEffort: 'high' } } },
      }],
    }],
  }
  const route = latestRoute({ config: { provider: '', model: '' }, sessions })
  assert.deepEqual(route, { provider: 'session', model: 'session-model', source: 'session' })
})
