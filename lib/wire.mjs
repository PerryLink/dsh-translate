// lib/wire.mjs — the Typert wire contract for the `translatePage` namespace.
//
// Two invocations, both read-only from the session's point of view:
//   status()             — is a model route resolvable, and which one?
//   translate(request)   — translate protected segments, nothing else.
//
// The host `./typert` manifest and the hand-written client Remote
// contribution share the descriptor shape; the client copy lives in
// client/index.js and a test asserts the two never drift.

import { z } from 'zod'

const PACKAGE = 'dsh-translate'

/** Remote namespace and service name. */
export const SERVICE = 'translatePage'

/** One string the model must leave untouched: a masked segment plus its slots. */
export const translateRequestSchema = z.object({
  /** Target language id (BCP 47 style, e.g. `zh`, `ja`, `de`). */
  targetLang: z.string().min(2).max(35),
  /** Segments already masked by the client; placeholders are `⟦n⟧`. */
  segments: z.array(z.string().min(1).max(4000)).min(1).max(200),
})

/** Result of `translatePage/translate`. */
export const translateResultSchema = z.object({
  /** One entry per input segment, in the same order. */
  translations: z.array(z.string()),
  /** Indexes the model could not translate safely; the client keeps the original. */
  failed: z.array(z.number().int().nonnegative()),
  /** Provider actually used, or null when no route resolved. */
  provider: z.string().nullable(),
  /** Model actually used, or null when no route resolved. */
  model: z.string().nullable(),
  /** Human-readable failure for the whole call, or null. */
  error: z.string().nullable(),
})

/** Result of `translatePage/status`. */
export const statusResultSchema = z.object({
  /** True when a provider/model route and the llm service are both available. */
  ready: z.boolean(),
  /** Configured target language, or an empty string to follow the UI locale. */
  targetLang: z.string(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  /** Why the service is not ready; null when ready. */
  reason: z.string().nullable(),
})

const SOURCE_LOCATION = Object.freeze({ file: 'lib/wire.mjs', line: 1, column: 1 })

/**
 * A strict Typert codec: the gateway consumes `codec.create().parse(value)`.
 * @param {string} typeSymbol - Typert type symbol for this codec.
 * @param {import('zod').ZodTypeAny} schema - authoritative validator.
 * @returns {{ mode: 'strict', typeSymbol: string, create: () => import('zod').ZodTypeAny }} codec.
 */
function strictCodec(typeSymbol, schema) {
  return {
    mode: 'strict',
    typeSymbol,
    create: () => schema,
  }
}

/** `translatePage/status` descriptor (no parameters). */
export const STATUS_DESCRIPTOR = Object.freeze({
  id: `${PACKAGE}#${SERVICE}/status`,
  service: SERVICE,
  namespace: SERVICE,
  method: 'status',
  invocation: Object.freeze({ kind: 'direct' }),
  parameters: Object.freeze([]),
  result: Object.freeze(strictCodec(`${PACKAGE}/types#TranslateStatus`, statusResultSchema)),
  sourceLocation: SOURCE_LOCATION,
})

/** `translatePage/translate` descriptor (one request object). */
export const TRANSLATE_DESCRIPTOR = Object.freeze({
  id: `${PACKAGE}#${SERVICE}/translate`,
  service: SERVICE,
  namespace: SERVICE,
  method: 'translate',
  invocation: Object.freeze({ kind: 'direct' }),
  parameters: Object.freeze([
    Object.freeze({
      name: 'request',
      wire: 'request',
      source: 'json',
      codec: Object.freeze(strictCodec(`${PACKAGE}/types#TranslateRequest`, translateRequestSchema)),
    }),
  ]),
  result: Object.freeze(strictCodec(`${PACKAGE}/types#TranslateResult`, translateResultSchema)),
  sourceLocation: SOURCE_LOCATION,
})

/** Invocation list shared by the host manifest and the client contribution. */
export const INVOCATIONS = Object.freeze([STATUS_DESCRIPTOR, TRANSLATE_DESCRIPTOR])
