import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { loadClient } from './helpers.mjs'

const client = await loadClient()
const { createEngine } = client.__test

function withDom(html) {
  const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>', { url: 'https://example.test/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.NodeFilter = dom.window.NodeFilter
  globalThis.MutationObserver = dom.window.MutationObserver
  return dom
}

test('translates prose, skips code and the control, restores originals', async () => {
  withDom('<p id="p">Hello world</p><pre>npm test</pre><code>const x = 1</code><span data-dsh-translate-ui>译</span><p id="n">Number 42 stays</p>')
  const api = {
    status: async () => ({ ready: true, targetLang: 'zh', provider: 'p', model: 'm', reason: null }),
    translate: async (lang, segments) => ({
      translations: segments.map((segment) => '译 ' + segment),
      failed: [],
      provider: 'p',
      model: 'm',
      error: null,
    }),
  }
  const engine = createEngine({ api, targetLang: 'zh' })
  await engine.start()
  assert.equal(document.getElementById('p').textContent, '译 Hello world')
  assert.equal(document.querySelector('pre').textContent, 'npm test')
  assert.equal(document.querySelector('code').textContent, 'const x = 1')
  assert.equal(document.querySelector('[data-dsh-translate-ui]').textContent, '译')
  assert.equal(document.getElementById('n').textContent, '译 Number 42 stays')
  engine.stop()
  assert.equal(document.getElementById('p').textContent, 'Hello world')
  assert.equal(document.getElementById('n').textContent, 'Number 42 stays')
})

test('reports a missing model route without touching the page', async () => {
  withDom('<p id="p">Hello world</p>')
  const api = {
    status: async () => ({ ready: false, targetLang: '', provider: null, model: null, reason: 'no model route' }),
    translate: async () => { throw new Error('should not be called') },
  }
  const engine = createEngine({ api, targetLang: 'zh' })
  await engine.start()
  assert.equal(document.getElementById('p').textContent, 'Hello world')
  assert.equal(engine.state().error, 'no model route')
  assert.equal(engine.state().enabled, false)
})
