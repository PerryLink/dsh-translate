// lib/service.mjs — the `translatePage` Typert service.
//
// Two read-only methods:
//   status()           — which model route would be used, or why none is available.
//   translate(request) — masked segments in, translations out.
//
// The service never touches the session log, the workspace or the network
// beyond the caller's own model route. A failed call returns the masked
// originals plus the failed indexes; the client keeps the original text for
// those and shows the error in the toggle.

import { BlockAssembler } from '@deepseek-ai/dsh-llm'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { translateSegments } from './engine.mjs'
import { SERVICE, translateRequestSchema } from './wire.mjs'

/**
 * Session event snapshot across harness lines: `snapshotEvents()` on newer
 * hosts, the `.events` getter on older ones.
 * @param {object | null | undefined} session - live session.
 * @returns {readonly object[]} event snapshot.
 */
export function sessionEvents(session) {
  if (session === null || session === undefined) return []
  const probe = /** @type {{ snapshotEvents?: () => readonly object[], events?: readonly object[] }} */ (session)
  if (typeof probe.snapshotEvents === 'function') return probe.snapshotEvents()
  return probe.events ?? []
}

/**
 * Resolve the provider/model route: an explicit config pair wins, otherwise
 * the newest `request/header` among live sessions.
 * @param {object} options - resolution inputs.
 * @param {{ list?: () => object[] } | undefined} options.sessions - host sessions service.
 * @param {{ provider?: string, model?: string }} options.config - resolved plugin config.
 * @returns {{ provider: string, model: string, source: 'config' | 'session' } | undefined} route or undefined.
 */
export function latestRoute({ sessions, config }) {
  if (typeof config?.provider === 'string' && config.provider.length > 0 && typeof config?.model === 'string' && config.model.length > 0) {
    return { provider: config.provider, model: config.model, source: 'config' }
  }
  const list = typeof sessions?.list === 'function' ? sessions.list() : []
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const events = sessionEvents(list[index])
    for (let cursor = events.length - 1; cursor >= 0; cursor -= 1) {
      const event = events[cursor]
      if (event === null || typeof event !== 'object' || event.type !== 'request/header') continue
      const header = /** @type {{ data?: { header?: { config?: { provider?: unknown, model?: unknown } } } }} */ (event).data?.header
      const provider = header?.config?.provider
      const model = header?.config?.model
      if (typeof provider === 'string' && provider.length > 0 && typeof model === 'string' && model.length > 0) {
        return { provider, model, source: 'session' }
      }
    }
  }
  return undefined
}

/** A service-shaped plugin whose deps are resolved by `index.mjs`. */
export class TranslateService extends TypertRemoteService {
  /**
   * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
   * @param {{ config: object, getLlm: () => any, sessions: object }} deps - resolved dependencies.
   */
  constructor(ctx, deps) {
    super(ctx, SERVICE)
    this._deps = deps
  }

  /**
   * Report whether a translation can run right now.
   * @returns {Promise<{ ready: boolean, targetLang: string, provider: string | null, model: string | null, reason: string | null }>} status.
   */
  async status() {
    const config = this._deps.config
    const llm = this._deps.getLlm()
    if (llm === undefined || llm === null || typeof llm.stream !== 'function') {
      return { ready: false, targetLang: config.targetLang, provider: null, model: null, reason: 'the llm service is not mounted in this profile' }
    }
    const route = latestRoute({ sessions: this._deps.sessions, config })
    if (route === undefined) {
      return {
        ready: false,
        targetLang: config.targetLang,
        provider: null,
        model: null,
        reason: 'no model route: set provider/model in the plugin config, or send one message first so a session records a request route',
      }
    }
    return { ready: true, targetLang: config.targetLang, provider: route.provider, model: route.model, reason: null }
  }

  /**
   * Translate masked segments with the resolved route.
   * @param {{ targetLang?: string, segments: string[] }} request - masked segments.
   * @returns {Promise<{ translations: string[], failed: number[], provider: string | null, model: string | null, error: string | null }>} result.
   */
  async translate(request) {
    const parsed = translateRequestSchema.safeParse(request)
    if (!parsed.success) {
      return {
        translations: Array.isArray(request?.segments) ? request.segments.map((segment) => String(segment)) : [],
        failed: [],
        provider: null,
        model: null,
        error: `invalid request: ${parsed.error.issues.map((issue) => issue.path.join('.') + ' ' + issue.message).join('; ')}`,
      }
    }
    const input = parsed.data
    const config = this._deps.config
    const targetLang = input.targetLang || config.targetLang
    if (typeof targetLang !== 'string' || targetLang.length === 0) {
      return {
        translations: input.segments,
        failed: input.segments.map((_, index) => index),
        provider: null,
        model: null,
        error: 'no target language: pass targetLang or set it in the plugin config',
      }
    }
    const llm = this._deps.getLlm()
    const route = latestRoute({ sessions: this._deps.sessions, config })
    if (llm === undefined || llm === null || typeof llm.stream !== 'function' || route === undefined) {
      return {
        translations: input.segments,
        failed: input.segments.map((_, index) => index),
        provider: null,
        model: null,
        error: 'no model route available',
      }
    }
    const result = await translateSegments({
      llm,
      route,
      targetLang,
      segments: input.segments,
      glossary: config.glossary,
      maxSegments: config.maxSegments,
      maxChars: config.maxChars,
      timeoutMs: config.timeoutMs,
      // Precedence: explicit config, then the `'off'` default. The inherited
      // `request/header` contributes provider/model only (see `latestRoute`), so
      // it can never turn thinking back on, and neither can the provider default.
      reasoningEffort: config.reasoningEffort ?? 'off',
      assembler: () => new BlockAssembler(),
    })
    return result
  }
}
