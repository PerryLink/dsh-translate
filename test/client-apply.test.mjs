import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { loadClient } from './helpers.mjs'

const client = await loadClient()

function fakeCtx(translations) {
  const state = { mounted: null, registered: null, injected: [], effects: [] }
  const ctx = {
    effect(fn, label) {
      const dispose = fn()
      state.effects.push({ label, dispose })
      return dispose
    },
    locale: {
      register(ns, dicts) { state.registered = { ns, dicts }; return () => {} },
      bind() { return (key) => key },
      getLocale() { return { active: 'zh', locales: [], revision: 0 } },
    },
    remote: {
      async $mount(contribution) { state.mounted = contribution },
      translatePage: {
        async status() { return { ok: true, value: { ready: true, targetLang: 'zh', provider: 'p', model: 'm', reason: null } } },
        async translate(request) {
          return { ok: true, value: { translations: request.segments.map((s) => '译 ' + s), failed: [], provider: 'p', model: 'm', error: null } }
        },
      },
    },
    inject(names, callback) { state.injected.push(names); callback(ctx) },
  }
  return { ctx, state, translations }
}

test('client apply mounts the Remote contribution and the page control', async () => {
  const dom = new JSDOM('<!doctype html><html><body><p id="p">Hello world</p></body></html>', { url: 'https://example.test/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.NodeFilter = dom.window.NodeFilter
  globalThis.MutationObserver = dom.window.MutationObserver
  const { ctx, state } = fakeCtx()
  await client.apply(ctx)
  assert.equal(state.mounted.package, 'dsh-translate')
  assert.equal(state.mounted.descriptors.length, 2)
  assert.equal(state.registered.ns, 'translate')
  assert.ok(document.querySelector('[data-dsh-translate-ui]') !== null)
  assert.deepEqual(state.injected[0], ['remote.translatePage'])
})
