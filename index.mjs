// index.mjs — `dsh-translate` host half.
//
// Mounts the `translatePage` Typert service (status + translate). The browser
// half owns the DOM walk, protection and the on/off control; this half only
// resolves the model route and runs the translation call through the host's
// own `ctx.llm`. Nothing is persisted: no session event, no workspace file,
// no translation cache on disk.

import z from '@deepseek-ai/schemastery'
import { TranslateService } from './lib/service.mjs'

/** Plugin name used by the Loader row and the client bundle. */
export const name = 'dsh-translate'

/** `sessions` is required to resolve the route; `llm` is looked up lazily so the plugin still loads without one. */
export const inject = ['sessions']

/** Raw plugin config; every field optional, defaults filled by {@link resolveConfig}. */
export const Config = z.object({
  /** Master switch; false registers nothing at all. */
  enabled: z.boolean().default(true),
  /** Default target language (BCP 47 style). Empty follows the web UI locale. */
  targetLang: z.string().default(''),
  /** Optional explicit provider/model pair; both or neither. */
  provider: z.string().default(''),
  /** Optional explicit model id; both or neither. */
  model: z.string().default(''),
  /** Per-call segment cap. */
  maxSegments: z.number().default(40),
  /** Per-call masked-character cap. */
  maxChars: z.number().default(6000),
  /** Per-call deadline in milliseconds. */
  timeoutMs: z.number().default(60000),
  /** Extra terms that must survive translation verbatim. */
  glossary: z.array(z.string()).default([]),
})

/**
 * Re-judge every default and bound so programmatic mounts fail loud instead of
 * running with hidden values.
 * @param {object | undefined} raw - loader config.
 * @returns {{ enabled: boolean, targetLang: string, provider: string, model: string, maxSegments: number, maxChars: number, timeoutMs: number, glossary: readonly string[] }} frozen config.
 */
export function resolveConfig(raw) {
  const value = raw ?? {}
  const fail = (/** @type {string} */ message) => {
    throw new TypeError(`dsh-translate: ${message}`)
  }
  const enabled = value.enabled ?? true
  if (typeof enabled !== 'boolean') fail('config.enabled must be a boolean')
  const targetLang = value.targetLang ?? ''
  if (typeof targetLang !== 'string') fail('config.targetLang must be a string')
  const provider = value.provider ?? ''
  const model = value.model ?? ''
  if (typeof provider !== 'string' || typeof model !== 'string') fail('config.provider and config.model must be strings')
  if ((provider.length === 0) !== (model.length === 0)) fail('config.provider and config.model must be set together')
  const maxSegments = value.maxSegments ?? 40
  if (!Number.isInteger(maxSegments) || maxSegments < 1 || maxSegments > 200) fail('config.maxSegments must be an integer between 1 and 200')
  const maxChars = value.maxChars ?? 6000
  if (!Number.isInteger(maxChars) || maxChars < 200 || maxChars > 40000) fail('config.maxChars must be an integer between 200 and 40000')
  const timeoutMs = value.timeoutMs ?? 60000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600000) fail('config.timeoutMs must be an integer between 1000 and 600000')
  const glossary = value.glossary ?? []
  if (!Array.isArray(glossary) || glossary.some((term) => typeof term !== 'string')) fail('config.glossary must be an array of strings')
  return { enabled, targetLang, provider, model, maxSegments, maxChars, timeoutMs, glossary: Object.freeze(glossary.slice()) }
}

/**
 * Mount the service when enabled.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 * @param {object} [config] - raw loader config.
 */
export function apply(ctx, config) {
  const resolved = resolveConfig(config)
  if (!resolved.enabled) return
  ctx.plugin(TranslateService, {
    config: resolved,
    sessions: ctx.sessions,
    getLlm: () => ctx.get('llm'),
  })
}

export { TranslateService } from './lib/service.mjs'
export { latestRoute, sessionEvents } from './lib/service.mjs'
