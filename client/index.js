// client/index.js — dsh-translate browser half: a page-level translator.
//
// Hand-written client bundle (no build step), same loader shape as
// dsh-checkpoint-rewind. It walks the rendered DOM, masks everything that must
// stay verbatim (code, paths, commands, identifiers, numbers, product names)
// into ⟦n⟧ placeholders, asks the host `translatePage` Remote to translate the
// prose, restores the placeholders and writes the result back into the same
// text nodes. A floating control switches between the translation and the
// original; the originals stay in memory, the session log is never touched.
//
// Host side: lib/service.mjs. The Remote descriptors below must match
// lib/wire.mjs exactly; test/descriptors.test.mjs enforces that.

window.__ModuleLoader__.load({
  id: 'dsh-translate',
  factory: function () {
    var module = { exports: {} }
    var exports = module.exports

    // ---------------------------------------------------------------------
    // Wire contract (keep in sync with lib/wire.mjs).
    // ---------------------------------------------------------------------
    var PACKAGE = 'dsh-translate'
    var SERVICE = 'translatePage'
    var SOURCE_LOCATION = Object.freeze({ file: 'lib/wire.mjs', line: 1, column: 1 })

    function strictCodec(typeSymbol, parse) {
      return Object.freeze({
        mode: 'strict',
        typeSymbol: typeSymbol,
        create: function () { return { parse: parse } },
      })
    }

    function assertObject(value, field) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('dsh-translate: unexpected ' + field + ' value')
      }
      return value
    }

    function parseStatus(value) {
      var v = assertObject(value, 'status')
      if (typeof v.ready !== 'boolean') throw new Error('status.ready')
      if (typeof v.targetLang !== 'string') throw new Error('status.targetLang')
      if (v.provider !== null && typeof v.provider !== 'string') throw new Error('status.provider')
      if (v.model !== null && typeof v.model !== 'string') throw new Error('status.model')
      if (v.reason !== null && typeof v.reason !== 'string') throw new Error('status.reason')
      return v
    }

    function parseTranslateRequest(value) {
      var v = assertObject(value, 'translateRequest')
      if (typeof v.targetLang !== 'string') throw new Error('translateRequest.targetLang')
      if (!Array.isArray(v.segments)) throw new Error('translateRequest.segments')
      for (var i = 0; i < v.segments.length; i += 1) {
        if (typeof v.segments[i] !== 'string') throw new Error('translateRequest.segments[' + i + ']')
      }
      return v
    }

    function parseTranslateResult(value) {
      var v = assertObject(value, 'translateResult')
      if (!Array.isArray(v.translations)) throw new Error('translateResult.translations')
      if (!Array.isArray(v.failed)) throw new Error('translateResult.failed')
      for (var i = 0; i < v.translations.length; i += 1) {
        if (typeof v.translations[i] !== 'string') throw new Error('translateResult.translations[' + i + ']')
      }
      return v
    }

    var STATUS_DESCRIPTOR = Object.freeze({
      id: PACKAGE + '#' + SERVICE + '/status',
      service: SERVICE,
      namespace: SERVICE,
      method: 'status',
      invocation: Object.freeze({ kind: 'direct' }),
      parameters: Object.freeze([]),
      result: strictCodec(PACKAGE + '/types#TranslateStatus', parseStatus),
      sourceLocation: SOURCE_LOCATION,
    })

    var TRANSLATE_DESCRIPTOR = Object.freeze({
      id: PACKAGE + '#' + SERVICE + '/translate',
      service: SERVICE,
      namespace: SERVICE,
      method: 'translate',
      invocation: Object.freeze({ kind: 'direct' }),
      parameters: Object.freeze([Object.freeze({
        name: 'request',
        wire: 'request',
        source: 'json',
        codec: strictCodec(PACKAGE + '/types#TranslateRequest', parseTranslateRequest),
      })]),
      result: strictCodec(PACKAGE + '/types#TranslateResult', parseTranslateResult),
      sourceLocation: SOURCE_LOCATION,
    })

    var INVOCATIONS = Object.freeze([STATUS_DESCRIPTOR, TRANSLATE_DESCRIPTOR])

    // ---------------------------------------------------------------------
    // Protection: everything that must survive translation verbatim.
    // ---------------------------------------------------------------------
    var PLACEHOLDER = /⟦(\d+)⟧/g
    var HAS_LETTERS = /[A-Za-z]/

    // Product names are ordinary words to a model, so they are matched as literal
    // alternatives before the generic rules.
    var PRODUCT_TERMS = [
      'DeepSeek Harness', 'DeepSeek', 'Cordis', 'npm', 'pnpm', 'yarn', 'bun', 'npx',
      'node', 'git', 'docker', 'kubectl', 'curl', 'GitHub', 'Gitee',
      'GitCode', 'Phocinae', 'PerryLink', 'DSH', 'MCP', 'JSON', 'OTLP', 'SQLite',
    ]

    var FIXED_PROTECTED = [
      '`[^`]+`',
      '\\b(?:https?|mailto):[^\\s<>"\'）)】]+',
      '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
      '(?:[A-Za-z]:\\\\[^\\s<>"\'）)，。；;]+)',
      '(?:\\/(?:[\\w.@-]+\\/)+[\\w.@-]*)',
      '(?:\\.{1,2}\\/[\\w.@-]+(?:\\/[\\w.@-]+)*)',
      '@[a-z0-9][\\w.-]*\\/[\\w.-]+',
      '\\bdsh-[a-z0-9][a-z0-9-]*\\b',
      '\\b[\\w.-]+\\.(?:mjs|js|ts|tsx|jsx|json|md|ya?ml|toml|lock|log|txt|png|jpe?g|gif|webp|svg|pdf|docx?|xlsx?|csv|zip|tgz|tar|gz|sh|ps1|bat|exe)\\b',
      '\\b[0-9a-f]{7,40}\\b',
      '\\bv?\\d+(?:\\.\\d+){1,3}(?:[-+][0-9A-Za-z.]+)?\\b',
      '\\b\\d+(?:\\.\\d+)?(?:%|ms|s|m|h|kb|mb|gb|tb|px|k|m|b|d)?\\b',
      '\\b[A-Z][A-Z0-9_]{2,}\\b',
      '\\b[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+\\b',
      '\\b[a-z]+[A-Z][A-Za-z0-9]*\\b',
    ]

    function escapeRegExp(text) {
      return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    // A command with a known subcommand must win over the bare product term
    // (e.g. `npm` would otherwise mask only the binary and leave `test`
    // translatable). Arguments are limited to flags and path/version-like
    // tokens so ordinary prose after the command is not swallowed.
    var COMMAND_WITH_ARGS = [
      '\\b(?:npm|pnpm|yarn|bun)\\s+(?:run\\s+)?(?:test|build|install|ci|add|remove|exec|start|dev|lint|publish|pack|version|audit|update|why|link|unlink)\\b(?:\\s+(?:-{1,2}[\\w-]+|[\\w.-]*[/:.][\\w./:-]+))*',
      '\\bgit\\s+(?:status|log|diff|add|commit|push|pull|checkout|switch|branch|merge|rebase|clone|fetch|show|tag|stash|remote|reset|restore)\\b(?:\\s+(?:-{1,2}[\\w-]+|[\\w.-]*[/:.][\\w./:-]+))*',
      '\\bdocker\\s+(?:run|build|ps|exec|logs|pull|push|compose)\\b(?:\\s+(?:-{1,2}[\\w-]+|[\\w.-]*[/:.][\\w./:-]+))*',
      '\\bkubectl\\s+(?:get|apply|describe|logs|exec|delete|port-forward)\\b(?:\\s+(?:-{1,2}[\\w-]+|[\\w.-]*[/:.][\\w./:-]+))*',
      '\\bcurl\\s+(?:-{1,2}[\\w-]+\\s+)*(?:https?://[^\\s]+)',
    ].join('|')

    function buildProtectRegex(glossary) {
      var terms = PRODUCT_TERMS.slice()
      if (Array.isArray(glossary)) {
        for (var i = 0; i < glossary.length; i += 1) {
          if (typeof glossary[i] === 'string' && glossary[i].trim().length > 0) terms.push(glossary[i])
        }
      }
      terms = terms
        .filter(function (term, index, all) { return all.indexOf(term) === index })
        .sort(function (a, b) { return b.length - a.length })
        .map(escapeRegExp)
      var parts = ['(?:' + COMMAND_WITH_ARGS + ')', '(?:' + terms.join('|') + ')'].concat(FIXED_PROTECTED)
      return new RegExp(parts.join('|'), 'g')
    }

    /**
     * Mask protected spans. Returns null when the text has no translatable prose.
     */
    function protectText(text, glossary) {
      if (typeof text !== 'string' || text.length === 0) return null
      var regex = buildProtectRegex(glossary)
      var slots = []
      var masked = ''
      var last = 0
      var match
      while ((match = regex.exec(text)) !== null) {
        if (match[0].length === 0) { regex.lastIndex += 1; continue }
        masked += text.slice(last, match.index) + '⟦' + slots.length + '⟧'
        slots.push(match[0])
        last = match.index + match[0].length
      }
      masked += text.slice(last)
      if (!HAS_LETTERS.test(masked)) return null
      if (masked.trim().length < 2) return null
      return { masked: masked, slots: slots }
    }

    /** Put the protected spans back. Returns null when the model altered a token. */
    function restoreText(text, slots) {
      if (typeof text !== 'string') return null
      var expected = []
      for (var i = 0; i < slots.length; i += 1) expected.push('⟦' + i + '⟧')
      expected.sort()
      var actual = (text.match(PLACEHOLDER) || []).slice().sort()
      if (actual.length !== expected.length) return null
      for (var j = 0; j < expected.length; j += 1) if (actual[j] !== expected[j]) return null
      return text.replace(PLACEHOLDER, function (token, index) {
        var slot = slots[Number(index)]
        return slot === undefined ? token : slot
      })
    }

    // ---------------------------------------------------------------------
    // Cache: display-only, bounded, never sent anywhere.
    // ---------------------------------------------------------------------
    var CACHE_KEY = 'dsh-translate:cache:v1'
    var CACHE_MAX = 600

    function hashText(text) {
      var hash = 5381
      for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0
      return (hash >>> 0).toString(36)
    }

    function loadCache() {
      var store = {}
      try {
        var raw = window.localStorage.getItem(CACHE_KEY)
        if (raw) store = JSON.parse(raw)
      } catch (error) { /* storage disabled: memory-only */ }
      return store
    }

    function saveCache(store) {
      try {
        var keys = Object.keys(store)
        for (var i = 0; i < keys.length - CACHE_MAX; i += 1) delete store[keys[i]]
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(store))
      } catch (error) { /* quota or disabled: keep memory copy */ }
    }

    // ---------------------------------------------------------------------
    // DOM walk.
    // ---------------------------------------------------------------------
    var SKIP_SELECTOR = [
      'script', 'style', 'noscript', 'template', 'textarea', 'input', 'select', 'option',
      'code', 'pre', 'kbd', 'samp', 'var', 'svg', 'math', 'canvas', 'iframe', 'object', 'audio', 'video',
      '[data-dsh-translate-ui]', '[contenteditable="true"]', '[translate="no"]', '[data-no-translate]',
    ].join(',')

    function nodeText(node) {
      var value = node && node.nodeValue
      return typeof value === 'string' ? value : ''
    }

    function isEligible(node) {
      var text = nodeText(node)
      if (text.trim().length < 2) return false
      if (!HAS_LETTERS.test(text)) return false
      var parent = node.parentElement
      if (parent === null) return false
      if (parent.closest(SKIP_SELECTOR) !== null) return false
      return true
    }

    function collectNodes(root) {
      var nodes = []
      if (typeof document === 'undefined' || root === null || root === undefined) return nodes
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          return isEligible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        },
      })
      var current = walker.nextNode()
      while (current !== null) {
        nodes.push(current)
        current = walker.nextNode()
      }
      return nodes
    }

    function splitWhitespace(text) {
      var lead = (text.match(/^\s*/) || [''])[0]
      var trail = (text.match(/\s*$/) || [''])[0]
      return { lead: lead, trail: trail, core: text.slice(lead.length, text.length - trail.length) }
    }

    // ---------------------------------------------------------------------
    // Engine.
    // ---------------------------------------------------------------------
    function createEngine(options) {
      var api = options.api
      var onState = options.onState
      var glossary = options.glossary || []
      var targetLang = options.targetLang || ''
      var state = { enabled: false, working: false, generation: 0, error: null }
      var originals = new Map()
      var displayed = new Map()
      var cache = loadCache()
      var observer = null
      var timer = null

      function report() {
        if (typeof onState === 'function') onState({ enabled: state.enabled, working: state.working, error: state.error })
      }

      function cacheKey(masked) {
        return targetLang + '\u0000' + masked
      }

      function applyValue(node, original, translation) {
        var parts = splitWhitespace(original)
        var value = parts.lead + translation + parts.trail
        originals.set(node, original)
        displayed.set(node, value)
        if (node.nodeValue !== value) node.nodeValue = value
      }

      function collectPending() {
        var pending = []
        var byKey = new Map()
        var nodes = collectNodes(document.body)
        for (var i = 0; i < nodes.length; i += 1) {
          var node = nodes[i]
          var original = nodeText(node)
          var applied = displayed.get(node)
          if (applied !== undefined && applied === original) continue
          var protectedText = protectText(original, glossary)
          if (protectedText === null) continue
          var key = cacheKey(protectedText.masked)
          var hit = cache[key]
          if (typeof hit === 'string') {
            var restored = restoreText(hit, protectedText.slots)
            if (restored !== null) { applyValue(node, original, restored); continue }
          }
          var existing = byKey.get(key)
          if (existing !== undefined) {
            existing.nodes.push({ node: node, original: original })
            continue
          }
          var entry = { key: key, masked: protectedText.masked, slots: protectedText.slots, nodes: [{ node: node, original: original }] }
          byKey.set(key, entry)
          pending.push(entry)
          if (pending.length >= 240) break
        }
        return pending
      }

      async function translatePending(pending, generation) {
        if (pending.length === 0) return
        state.working = true
        state.error = null
        report()
        var chunkSize = 40
        for (var start = 0; start < pending.length; start += chunkSize) {
          if (generation !== state.generation) return
          var chunk = pending.slice(start, start + chunkSize)
          var segments = chunk.map(function (entry) { return entry.masked })
          var result
          try {
            result = await api.translate(targetLang, segments)
          } catch (error) {
            state.error = error instanceof Error ? error.message : String(error)
            break
          }
          if (generation !== state.generation) return
          var translations = result.translations || []
          var failed = new Set(result.failed || [])
          for (var index = 0; index < chunk.length; index += 1) {
            if (failed.has(index)) continue
            var entry = chunk[index]
            var restored = restoreText(translations[index], entry.slots)
            if (restored === null) continue
            cache[entry.key] = translations[index]
            for (var n = 0; n < entry.nodes.length; n += 1) {
              var target = entry.nodes[n]
              if (target.node.isConnected && nodeText(target.node) === target.original) {
                applyValue(target.node, target.original, restored)
              }
            }
          }
          if (typeof result.error === 'string' && result.error.length > 0) state.error = result.error
        }
        saveCache(cache)
        state.working = false
        report()
      }

      async function scan() {
        if (!state.enabled) return
        var generation = state.generation
        var pending = collectPending()
        if (pending.length === 0) return
        try {
          await translatePending(pending, generation)
        } catch (error) {
          state.error = error instanceof Error ? error.message : String(error)
          state.working = false
          report()
        }
      }

      function schedule() {
        if (!state.enabled) return
        if (timer !== null) clearTimeout(timer)
        timer = setTimeout(function () {
          timer = null
          scan().catch(function () { /* reported inside scan */ })
        }, 350)
      }

      function startObserver() {
        if (observer !== null || typeof MutationObserver === 'undefined') return
        observer = new MutationObserver(function () { schedule() })
        observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      }

      function stopObserver() {
        if (observer !== null) observer.disconnect()
        observer = null
        if (timer !== null) clearTimeout(timer)
        timer = null
      }

      function restoreAll() {
        originals.forEach(function (original, node) {
          if (node.isConnected && nodeText(node) !== original) node.nodeValue = original
        })
        originals.clear()
        displayed.clear()
      }

      async function start() {
        if (state.enabled) return
        state.generation += 1
        state.error = null
        state.working = false
        var status
        try {
          status = await api.status()
        } catch (error) {
          state.error = error instanceof Error ? error.message : String(error)
          report()
          return
        }
        if (!status.ready) {
          state.error = status.reason || 'no model route'
          report()
          return
        }
        if (targetLang === '') targetLang = status.targetLang || ''
        if (targetLang === '') {
          state.error = 'target language is empty; set targetLang in the plugin config'
          report()
          return
        }
        state.enabled = true
        report()
        startObserver()
        await scan()
      }

      function stop() {
        state.generation += 1
        state.enabled = false
        state.working = false
        stopObserver()
        restoreAll()
        report()
      }

      async function toggle() {
        if (state.enabled) stop()
        else await start()
      }

      return {
        toggle: toggle,
        start: start,
        stop: stop,
        dispose: function () { stop() },
        state: function () { return { enabled: state.enabled, working: state.working, error: state.error } },
      }
    }

    // ---------------------------------------------------------------------
    // UI: one floating control, excluded from translation by its attribute.
    // ---------------------------------------------------------------------
    var NS = 'translate'
    var DICTS = {
      zh: { idle: '译', on: '原文', working: '译…', title: '整页翻译：只替换显示文字，代码、路径、命令与专名保持原样；再点一次还原' },
      en: { idle: 'Translate', on: 'Original', working: 'Translating…', title: 'Translate the page: display only; code, paths, commands and product names stay verbatim' },
    }

    function createUi(t, engine) {
      var host = document.createElement('div')
      host.setAttribute('data-dsh-translate-ui', '')
      host.setAttribute('translate', 'no')
      host.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;gap:6px;align-items:center;font:12px/1.4 system-ui,sans-serif'
      var button = document.createElement('button')
      button.type = 'button'
      button.style.cssText = 'cursor:pointer;border:1px solid rgba(125,125,125,.45);border-radius:999px;padding:7px 12px;background:rgba(30,30,30,.82);color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.25)'
      host.appendChild(button)
      var errorBadge = document.createElement('span')
      errorBadge.style.cssText = 'max-width:280px;color:#ffb4a8;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'
      host.appendChild(errorBadge)
      document.body.appendChild(host)

      function render(state) {
        if (state.working) button.textContent = t('working')
        else if (state.enabled) button.textContent = t('on')
        else button.textContent = t('idle')
        button.title = state.error || t('title')
        errorBadge.textContent = state.error || ''
        errorBadge.style.display = state.error ? 'inline' : 'none'
        button.disabled = state.working
        button.style.opacity = state.working ? '0.7' : '1'
      }

      button.addEventListener('click', function () { engine.toggle() })
      render({ enabled: false, working: false, error: null })

      return {
        render: render,
        dispose: function () {
          if (host.parentNode) host.parentNode.removeChild(host)
        },
      }
    }

    // ---------------------------------------------------------------------
    // Plugin entry.
    // ---------------------------------------------------------------------
    function unwrap(result) {
      if (result !== null && typeof result === 'object' && result.ok === true) return result.value
      var error = result && result.error ? result.error : { code: 'remote', message: 'remote call failed' }
      throw new Error((error.code ? error.code + ': ' : '') + (error.message || 'remote call failed'))
    }

    var name = 'dsh-translate-client'
    var inject = ['locale', 'remote']

    async function apply(ctx) {
      ctx.effect(function () { return ctx.locale.register(NS, DICTS) }, 'dsh-translate: dictionaries')
      await ctx.remote.$mount({ package: PACKAGE, descriptors: INVOCATIONS })
      ctx.inject(['remote.translatePage'], function (scope) {
        var t = scope.locale.bind(NS)
        var api = {
          status: function () { return Promise.resolve(scope.remote.translatePage.status()).then(unwrap) },
          translate: function (targetLang, segments) {
            return Promise.resolve(scope.remote.translatePage.translate({ targetLang: targetLang, segments: segments })).then(unwrap)
          },
        }
        var navigatorLang = (typeof navigator !== 'undefined' && navigator.language) ? String(navigator.language).split('-')[0] : ''
        var active = scope.locale.getLocale ? scope.locale.getLocale().active : 'en'
        var targetLang = active && active !== 'en' ? active : navigatorLang
        if (targetLang === 'en') targetLang = ''
        var ui = null
        var engine = createEngine({
          api: api,
          glossary: [],
          targetLang: targetLang,
          onState: function (state) { if (ui !== null) ui.render(state) },
        })
        scope.effect(function () {
          if (typeof document === 'undefined') return function () {}
          var mount = function () {
            ui = createUi(t, engine)
            ui.render(engine.state())
          }
          if (document.body) mount()
          else document.addEventListener('DOMContentLoaded', mount, { once: true })
          return function () {
            if (ui !== null) ui.dispose()
            engine.dispose()
          }
        }, 'dsh-translate: page control')
      })
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    exports.__test = {
      protectText: protectText,
      restoreText: restoreText,
      buildProtectRegex: buildProtectRegex,
      hashText: hashText,
      INVOCATIONS: INVOCATIONS,
      createEngine: createEngine,
      DICTS: DICTS,
      collectNodes: collectNodes,
    }
    return module.exports
  },
})
