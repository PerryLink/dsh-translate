// lib/engine.mjs — the model-facing half of the translator: prompt, batching,
// parsing and placeholder verification. Deliberately free of cordis and DOM so
// it can be tested with a fake `llm.stream`.
//
// The client masks every protected span (code, paths, commands, identifiers,
// numbers, product names) into `⟦n⟧` before it sends a segment. This module
// treats those placeholders as the trust boundary: a translation that loses,
// renumbers or duplicates a placeholder is discarded and the segment keeps its
// original text. Nothing here writes to a session, a file or the network; the
// only side effect is the caller-provided model stream.

/** Placeholder token used by the client and verified here. */
export const PLACEHOLDER = /⟦(\d+)⟧/g

/** Product names the family never translates when they appear as words. */
export const DEFAULT_GLOSSARY = Object.freeze([
  'DeepSeek Harness',
  'DeepSeek',
  'Cordis',
  'npm',
  'pnpm',
  'GitHub',
  'Gitee',
  'GitCode',
  'Phocinae',
  'PerryLink',
  'DSH',
  'MCP',
  'JSON',
  'OTLP',
  'SQLite',
])

/**
 * Placeholder tokens of one string, sorted for multiset comparison.
 * @param {string} text - masked or translated text.
 * @returns {string[]} placeholder tokens in stable order.
 */
export function placeholdersOf(text) {
  return [...String(text).matchAll(PLACEHOLDER)].map((match) => match[0]).sort()
}

/**
 * True when both strings carry exactly the same placeholder multiset.
 * @param {string} input - masked source segment.
 * @param {string} output - model translation.
 * @returns {boolean} whether the translation is structurally safe to merge.
 */
export function placeholdersIntact(input, output) {
  const a = placeholdersOf(input)
  const b = placeholdersOf(output)
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return false
  return true
}

/**
 * Build the strict translation system prompt.
 * @param {string} targetLang - target language id.
 * @param {readonly string[]} glossary - extra terms to keep verbatim.
 * @returns {string} system prompt.
 */
export function buildSystemPrompt(targetLang, glossary = []) {
  const terms = [...new Set([...DEFAULT_GLOSSARY, ...glossary].filter((term) => typeof term === 'string' && term.trim().length > 0))]
  return [
    `You translate visible text from a developer tool's web interface into ${targetLang}.`,
    'The user message is a JSON array of strings. Return ONLY a JSON array of strings with exactly the same length and order.',
    '',
    'Rules:',
    '1. Tokens like ⟦0⟧ or ⟦12⟧ are opaque placeholders. Reproduce every placeholder exactly once, unchanged, and keep it near the same words. Never add, drop, renumber, translate or reorder a placeholder.',
    '2. Never translate or alter: code, shell commands and flags, file paths, URLs, email addresses, package names, identifiers, environment variables, hashes, version numbers, plain numbers, or the protected terms below.',
    `3. Protected terms, keep verbatim: ${terms.join(', ')}.`,
    '4. Preserve leading and trailing whitespace, punctuation and markdown emphasis exactly.',
    `5. If a string is already in ${targetLang}, or contains no translatable prose, return it unchanged.`,
    '6. Output only the JSON array: no code fences, no commentary, no extra keys.',
  ].join('\n')
}

/**
 * Split segments into batches bounded by count and total characters.
 * @param {readonly string[]} segments - masked segments.
 * @param {number} maxSegments - per-call segment cap.
 * @param {number} maxChars - per-call character cap.
 * @returns {Array<{ start: number, items: string[] }>} batches with their offsets.
 */
export function batchSegments(segments, maxSegments, maxChars) {
  const batches = []
  let start = 0
  let current = []
  let chars = 0
  const flush = () => {
    if (current.length > 0) batches.push({ start, items: current })
    start += current.length
    current = []
    chars = 0
  }
  for (const segment of segments) {
    const size = segment.length
    if (current.length > 0 && (current.length >= maxSegments || chars + size > maxChars)) flush()
    current.push(segment)
    chars += size
  }
  flush()
  return batches
}

/**
 * Pull the JSON array out of a model answer that may carry fences or prose.
 * @param {string} text - assembled model text.
 * @returns {unknown} parsed value, or undefined when no JSON array is present.
 */
export function parseArrayAnswer(text) {
  const raw = String(text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const first = raw.indexOf('[')
  const last = raw.lastIndexOf(']')
  if (first < 0 || last <= first) return undefined
  try {
    return JSON.parse(raw.slice(first, last + 1))
  } catch {
    return undefined
  }
}

/**
 * Read the assembled text blocks of a stream.
 * @param {{ blocks: () => Array<{ type: string, text?: string }> }} assembler - BlockAssembler.
 * @returns {string} concatenated text blocks.
 */
export function textOf(assembler) {
  return assembler.blocks().filter((block) => block.type === 'text' && typeof block.text === 'string').map((block) => block.text).join('')
}

/**
 * Translate one batch through the caller's model route.
 * @param {object} options - translation call options.
 * @param {{ stream: (request: object) => AsyncIterable<object> }} options.llm - the host llm service.
 * @param {{ provider: string, model: string }} options.route - resolved provider/model.
 * @param {string} options.targetLang - target language id.
 * @param {string} options.system - system prompt.
 * @param {string[]} options.items - masked segments.
 * @param {number} options.timeoutMs - per-call deadline.
 * @param {AbortSignal} [options.signal] - caller cancellation.
 * @param {() => { push: (chunk: object) => void, blocks: () => Array<{ type: string, text?: string }> }} [options.assembler] - per-batch assembler factory.
 * @returns {Promise<{ ok: boolean, values?: string[], error?: string }>} batch result.
 */
export async function translateBatch(options) {
  const { llm, route, targetLang, system, items, timeoutMs, signal, assembler } = options
  const bucket = assembler === undefined ? undefined : assembler()
  const controller = new AbortController()
  const forward = () => controller.abort()
  if (signal !== undefined) {
    if (signal.aborted) return { ok: false, error: 'cancelled' }
    signal.addEventListener('abort', forward, { once: true })
  }
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  try {
    const request = {
      provider: route.provider,
      model: route.model,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: JSON.stringify(items) }] }],
      temperature: 0,
      signal: controller.signal,
    }
    let finish
    for await (const chunk of llm.stream(request)) {
      if (bucket !== undefined) bucket.push(chunk)
      if (chunk !== null && typeof chunk === 'object' && /** @type {{ type?: unknown }} */ (chunk).type === 'finish') {
        finish = chunk
        break
      }
    }
    if (timedOut) return { ok: false, error: `timeout after ${timeoutMs} ms` }
    if (finish === undefined) return { ok: false, error: 'stream ended without a finish chunk' }
    const reason = /** @type {{ reason?: { kind?: string, failure?: { message?: string, code?: string } } }} */ (finish).reason
    if (reason?.kind !== 'stop') {
      const detail = reason?.failure ?? {}
      return { ok: false, error: `model ended with ${String(reason?.kind)}: ${String(detail.message ?? detail.code ?? '')}` }
    }
    const text = bucket === undefined ? '' : textOf(bucket)
    const parsed = parseArrayAnswer(text)
    if (!Array.isArray(parsed) || parsed.length !== items.length) {
      return { ok: false, error: 'model answer is not a JSON array of the expected length' }
    }
    const values = []
    for (let index = 0; index < items.length; index += 1) {
      const value = parsed[index]
      if (typeof value !== 'string' || !placeholdersIntact(items[index], value)) {
        return { ok: false, error: `segment ${index} lost or changed a placeholder` }
      }
      values.push(value)
    }
    return { ok: true, values }
  } catch (error) {
    if (timedOut) return { ok: false, error: `timeout after ${timeoutMs} ms` }
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timer)
    if (signal !== undefined) signal.removeEventListener('abort', forward)
  }
}

/**
 * Translate every segment, batch by batch, keeping originals for failed ones.
 * @param {object} options - whole-call options (route, llm, target, bounds).
 * @param {{ stream: Function }} options.llm - host llm service.
 * @param {{ provider: string, model: string }} options.route - resolved route.
 * @param {string} options.targetLang - target language id.
 * @param {readonly string[]} options.segments - masked segments.
 * @param {readonly string[]} [options.glossary] - extra protected terms.
 * @param {number} [options.maxSegments] - per-call segment cap.
 * @param {number} [options.maxChars] - per-call character cap.
 * @param {number} [options.timeoutMs] - per-call deadline.
 * @param {AbortSignal} [options.signal] - caller cancellation.
 * @param {() => { push: (chunk: object) => void, blocks: () => Array<{ type: string, text?: string }> }} [options.assembler] - per-batch assembler factory.
 * @returns {Promise<{ translations: string[], failed: number[], provider: string, model: string, error: string | null }>} result.
 */
export async function translateSegments(options) {
  const {
    llm, route, targetLang, segments,
    glossary = [], maxSegments = 40, maxChars = 6000, timeoutMs = 60000, signal,
    assembler,
  } = options
  const system = buildSystemPrompt(targetLang, glossary)
  const translations = segments.slice()
  const failed = []
  let error = null
  const batches = batchSegments(segments, maxSegments, maxChars)
  for (const batch of batches) {
    const result = await translateBatch({
      llm, route, targetLang, system, items: batch.items, timeoutMs, signal, assembler,
    })
    if (result.ok && result.values !== undefined) {
      for (let index = 0; index < result.values.length; index += 1) translations[batch.start + index] = result.values[index]
      continue
    }
    error = result.error ?? 'translation failed'
    for (let index = 0; index < batch.items.length; index += 1) failed.push(batch.start + index)
  }
  return { translations, failed, provider: route.provider, model: route.model, error }
}
