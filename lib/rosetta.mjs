/**
 * Vendor parameter translation table for DeepSeek Harness.
 *
 * Ported from GPT-Rosetta-Stone
 * (https://github.com/PerryLink/GPT-Rosetta-Stone, Apache-2.0):
 *   - `src/gpt_rosetta_stone/adapters/*.py` (openai/ernie/qwen adapters)
 *   - `src/gpt_rosetta_stone/mappings/*.py` (parameter maps and value transforms)
 *   - `src/gpt_rosetta_stone/models.py` (the standard request fields)
 *   - `tests/` and `examples/basic_usage.py` (behavior converted to
 *     `test/rosetta.test.mjs` regression cases)
 *
 * Rows whose `source` is `'extended'` are NOT part of the upstream dataset:
 * they extend the table with vendors/fields documented by the public API
 * references of each vendor so `/translate` can answer cross-vendor queries
 * beyond the original openai/ernie/qwen trio. Ported rows are never changed.
 *
 * This module is pure data plus pure functions: no I/O, no Cordis services.
 *
 * @module dsh-translate/lib/rosetta
 */

/** One vendor in the table. */
const VENDORS = [
  { id: 'openai', name: 'OpenAI', apiStyle: 'openai', source: 'ported' },
  { id: 'ernie', name: 'Baidu ERNIE (Wenxin)', apiStyle: 'native', source: 'ported' },
  { id: 'qwen', name: 'Alibaba Qwen (DashScope)', apiStyle: 'native', source: 'ported' },
  { id: 'anthropic', name: 'Anthropic Claude', apiStyle: 'anthropic', source: 'extended' },
  { id: 'google', name: 'Google Gemini', apiStyle: 'gemini', source: 'extended' },
  { id: 'deepseek', name: 'DeepSeek', apiStyle: 'openai', source: 'extended' },
  { id: 'mistral', name: 'Mistral AI', apiStyle: 'openai', source: 'extended' },
  { id: 'cohere', name: 'Cohere', apiStyle: 'native', source: 'extended' },
  { id: 'xai', name: 'xAI Grok', apiStyle: 'openai', source: 'extended' },
  { id: 'groq', name: 'Groq', apiStyle: 'openai', source: 'extended' },
  { id: 'azure', name: 'Azure OpenAI', apiStyle: 'openai', source: 'extended' },
]

/** Canonical parameter ids understood by this table. */
const PARAMS = [
  'model',
  'messages',
  'system',
  'temperature',
  'top_p',
  'max_tokens',
  'stream',
  'stop',
  'n',
  'presence_penalty',
  'frequency_penalty',
  'top_k',
  'seed',
]

/**
 * `TABLE[param][vendor]` describes one vendor's spelling and semantics for one
 * canonical parameter. `name` is the wire name; `supported: false` marks a
 * parameter the vendor has no equivalent for (it is dropped with a warning by
 * `transformRequest`); `transform` optionally rewrites the value (upstream
 * `*_VALUE_TRANSFORMS`); `notes` records semantic differences.
 */
const TABLE = /** @type {Record<string, Record<string, any>>} */ ({
  model: {
    openai: { name: 'model', supported: true, source: 'ported' },
    ernie: { name: 'model', supported: true, source: 'ported' },
    qwen: { name: 'model', supported: true, source: 'ported' },
    anthropic: { name: 'model', supported: true, source: 'extended' },
    google: { name: 'model', supported: true, source: 'extended' },
    deepseek: { name: 'model', supported: true, source: 'extended' },
    mistral: { name: 'model', supported: true, source: 'extended' },
    cohere: { name: 'model', supported: true, source: 'extended' },
    xai: { name: 'model', supported: true, source: 'extended' },
    groq: { name: 'model', supported: true, source: 'extended' },
    azure: { name: 'model', supported: true, source: 'extended', notes: 'deployment name; the full model id lives in the request URL' },
  },
  messages: {
    openai: { name: 'messages', supported: true, source: 'ported' },
    ernie: { name: 'messages', supported: true, source: 'ported' },
    qwen: { name: 'messages', supported: true, source: 'ported' },
    anthropic: { name: 'messages', supported: true, source: 'extended' },
    google: { name: 'contents', supported: true, source: 'extended', notes: 'role system maps to systemInstruction instead' },
    deepseek: { name: 'messages', supported: true, source: 'extended' },
    mistral: { name: 'messages', supported: true, source: 'extended' },
    cohere: { name: 'messages', supported: true, source: 'extended' },
    xai: { name: 'messages', supported: true, source: 'extended' },
    groq: { name: 'messages', supported: true, source: 'extended' },
    azure: { name: 'messages', supported: true, source: 'extended' },
  },
  system: {
    openai: { name: 'system', supported: true, source: 'extended', notes: 'sent as a message with role "system"' },
    ernie: { name: 'system', supported: true, source: 'extended', notes: 'sent as a message with role "system"' },
    qwen: { name: 'system', supported: true, source: 'extended', notes: 'sent as a message with role "system"' },
    anthropic: { name: 'system', supported: true, source: 'extended', notes: 'top-level field (string or blocks), not a message' },
    google: { name: 'systemInstruction', supported: true, source: 'extended', notes: 'top-level field; `system_instruction` is also accepted' },
    deepseek: { name: 'system', supported: true, source: 'extended', notes: 'sent as a message with role "system"' },
    mistral: { name: 'system', supported: true, source: 'extended', notes: 'sent as a message with role "system"' },
    cohere: { name: 'system', supported: true, source: 'extended', notes: 'sent as a message with role "system" (chat v2)' },
    xai: { name: 'system', supported: true, source: 'extended', notes: 'sent as a message with role "system"' },
    groq: { name: 'system', supported: true, source: 'extended', notes: 'sent as a message with role "system"' },
    azure: { name: 'system', supported: true, source: 'extended', notes: 'sent as a message with role "system"' },
  },
  temperature: {
    openai: { name: 'temperature', supported: true, source: 'ported' },
    ernie: { name: 'temperature', supported: true, source: 'ported', transform: { kind: 'clamp', min: 0.01, max: 1.0 } },
    qwen: { name: 'temperature', supported: true, source: 'ported' },
    anthropic: { name: 'temperature', supported: true, source: 'extended', notes: 'range 0..1' },
    google: { name: 'generationConfig.temperature', supported: true, source: 'extended', notes: 'range 0..2' },
    deepseek: { name: 'temperature', supported: true, source: 'extended', notes: 'range 0..2' },
    mistral: { name: 'temperature', supported: true, source: 'extended' },
    cohere: { name: 'temperature', supported: true, source: 'extended', notes: 'range 0..5' },
    xai: { name: 'temperature', supported: true, source: 'extended', notes: 'range 0..2' },
    groq: { name: 'temperature', supported: true, source: 'extended' },
    azure: { name: 'temperature', supported: true, source: 'extended' },
  },
  top_p: {
    openai: { name: 'top_p', supported: true, source: 'ported' },
    ernie: { name: 'top_p', supported: true, source: 'ported', transform: { kind: 'clamp', min: 0.0, max: 1.0 } },
    qwen: { name: 'top_p', supported: true, source: 'ported' },
    anthropic: { name: 'top_p', supported: true, source: 'extended', notes: 'use with top_k instead of temperature' },
    google: { name: 'generationConfig.topP', supported: true, source: 'extended', notes: 'range 0..1' },
    deepseek: { name: 'top_p', supported: true, source: 'extended', notes: 'recommended to use together with temperature' },
    mistral: { name: 'top_p', supported: true, source: 'extended' },
    cohere: { name: 'p', supported: true, source: 'extended' },
    xai: { name: 'top_p', supported: true, source: 'extended' },
    groq: { name: 'top_p', supported: true, source: 'extended' },
    azure: { name: 'top_p', supported: true, source: 'extended' },
  },
  max_tokens: {
    openai: { name: 'max_tokens', supported: true, source: 'ported', notes: 'newer reasoning models prefer max_completion_tokens' },
    ernie: { name: 'max_output_tokens', supported: true, source: 'ported' },
    qwen: { name: 'max_tokens', supported: true, source: 'ported' },
    anthropic: { name: 'max_tokens', supported: true, source: 'extended', notes: 'REQUIRED for most Anthropic models' },
    google: { name: 'generationConfig.maxOutputTokens', supported: true, source: 'extended' },
    deepseek: { name: 'max_tokens', supported: true, source: 'extended' },
    mistral: { name: 'max_tokens', supported: true, source: 'extended' },
    cohere: { name: 'max_tokens', supported: true, source: 'extended' },
    xai: { name: 'max_tokens', supported: true, source: 'extended' },
    groq: { name: 'max_tokens', supported: true, source: 'extended', notes: 'max_completion_tokens is also accepted' },
    azure: { name: 'max_tokens', supported: true, source: 'extended' },
  },
  stream: {
    openai: { name: 'stream', supported: true, source: 'ported' },
    ernie: { name: 'stream', supported: true, source: 'ported' },
    qwen: { name: 'stream', supported: true, source: 'ported' },
    anthropic: { name: 'stream', supported: true, source: 'extended' },
    google: { name: 'stream', supported: true, source: 'extended', notes: 'API option (generateContent vs streamGenerateContent), not a body field' },
    deepseek: { name: 'stream', supported: true, source: 'extended' },
    mistral: { name: 'stream', supported: true, source: 'extended' },
    cohere: { name: 'stream', supported: true, source: 'extended' },
    xai: { name: 'stream', supported: true, source: 'extended' },
    groq: { name: 'stream', supported: true, source: 'extended' },
    azure: { name: 'stream', supported: true, source: 'extended' },
  },
  stop: {
    openai: { name: 'stop', supported: true, source: 'ported' },
    ernie: { name: null, supported: false, source: 'ported', notes: 'no equivalent; the upstream table marks it unsupported' },
    qwen: { name: null, supported: false, source: 'ported', notes: 'no equivalent; the upstream table marks it unsupported' },
    anthropic: { name: 'stop_sequences', supported: true, source: 'extended' },
    google: { name: 'generationConfig.stopSequences', supported: true, source: 'extended' },
    deepseek: { name: 'stop', supported: true, source: 'extended' },
    mistral: { name: 'stop', supported: true, source: 'extended' },
    cohere: { name: 'stop_sequences', supported: true, source: 'extended' },
    xai: { name: 'stop', supported: true, source: 'extended' },
    groq: { name: 'stop', supported: true, source: 'extended' },
    azure: { name: 'stop', supported: true, source: 'extended' },
  },
  n: {
    openai: { name: 'n', supported: true, source: 'ported' },
    ernie: { name: null, supported: false, source: 'ported', notes: 'no equivalent; the upstream table marks it unsupported' },
    qwen: { name: null, supported: false, source: 'ported', notes: 'no equivalent; the upstream table marks it unsupported' },
    anthropic: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    google: { name: 'generationConfig.candidateCount', supported: true, source: 'extended' },
    deepseek: { name: 'n', supported: true, source: 'extended', notes: 'single candidate for most models' },
    mistral: { name: 'n', supported: true, source: 'extended' },
    cohere: { name: 'n', supported: true, source: 'extended' },
    xai: { name: 'n', supported: true, source: 'extended' },
    groq: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    azure: { name: 'n', supported: true, source: 'extended' },
  },
  presence_penalty: {
    openai: { name: 'presence_penalty', supported: true, source: 'ported' },
    ernie: { name: 'penalty_score', supported: true, source: 'ported' },
    qwen: { name: 'presence_penalty', supported: true, source: 'ported' },
    anthropic: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    google: { name: 'generationConfig.presencePenalty', supported: true, source: 'extended', notes: 'v1beta models only' },
    deepseek: { name: 'presence_penalty', supported: true, source: 'extended' },
    mistral: { name: 'presence_penalty', supported: true, source: 'extended', notes: 'model-dependent' },
    cohere: { name: 'presence_penalty', supported: true, source: 'extended' },
    xai: { name: 'presence_penalty', supported: true, source: 'extended' },
    groq: { name: 'presence_penalty', supported: true, source: 'extended' },
    azure: { name: 'presence_penalty', supported: true, source: 'extended' },
  },
  frequency_penalty: {
    openai: { name: 'frequency_penalty', supported: true, source: 'ported' },
    ernie: { name: null, supported: false, source: 'ported', notes: 'no equivalent; the upstream table marks it unsupported' },
    qwen: { name: null, supported: false, source: 'ported', notes: 'no equivalent; the upstream table marks it unsupported' },
    anthropic: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    google: { name: 'generationConfig.frequencyPenalty', supported: true, source: 'extended', notes: 'v1beta models only' },
    deepseek: { name: 'frequency_penalty', supported: true, source: 'extended' },
    mistral: { name: 'frequency_penalty', supported: true, source: 'extended', notes: 'model-dependent' },
    cohere: { name: 'frequency_penalty', supported: true, source: 'extended' },
    xai: { name: 'frequency_penalty', supported: true, source: 'extended' },
    groq: { name: 'frequency_penalty', supported: true, source: 'extended' },
    azure: { name: 'frequency_penalty', supported: true, source: 'extended' },
  },
  top_k: {
    openai: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    ernie: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    qwen: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    anthropic: { name: 'top_k', supported: true, source: 'extended' },
    google: { name: 'generationConfig.topK', supported: true, source: 'extended' },
    deepseek: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    mistral: { name: 'top_k', supported: true, source: 'extended', notes: 'some models' },
    cohere: { name: 'k', supported: true, source: 'extended' },
    xai: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    groq: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    azure: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
  },
  seed: {
    openai: { name: 'seed', supported: true, source: 'extended' },
    ernie: { name: null, supported: false, source: 'extended', notes: 'no equivalent' },
    qwen: { name: 'seed', supported: true, source: 'extended' },
    anthropic: { name: 'seed', supported: true, source: 'extended', notes: 'beta parameter' },
    google: { name: 'generationConfig.seed', supported: true, source: 'extended' },
    deepseek: { name: 'seed', supported: true, source: 'extended' },
    mistral: { name: 'random_seed', supported: true, source: 'extended' },
    cohere: { name: 'seed', supported: true, source: 'extended' },
    xai: { name: 'seed', supported: true, source: 'extended' },
    groq: { name: 'seed', supported: true, source: 'extended' },
    azure: { name: 'seed', supported: true, source: 'extended' },
  },
})

/**
 * Canonical parameter ids, in display order.
 * @returns {readonly string[]}
 */
export function paramList() {
  return Object.freeze([...PARAMS])
}

/**
 * Vendor ids, in display order.
 * @returns {readonly string[]}
 */
export function vendorIds() {
  return Object.freeze(VENDORS.map(vendor => vendor.id))
}

/**
 * Resolve one vendor id (case-insensitive). Unknown ids return `undefined`.
 * @param {string} id - vendor id such as `'openai'` or `'ERNIE'`.
 * @returns {{ id: string, name: string, apiStyle: string, source: string } | undefined} the frozen vendor descriptor.
 */
export function describeVendor(id) {
  return VENDORS.find(vendor => vendor.id === String(id).toLowerCase())
}

/**
 * One canonical parameter's entry for one vendor.
 * @param {string} param - canonical parameter id.
 * @param {string} vendor - vendor id.
 * @returns {{ name: string | null, supported: boolean, transform?: object, notes?: string, source: string } | undefined} `{ name, supported, transform?, notes?, source }`.
 */
export function describeParam(param, vendor) {
  const row = TABLE[param]?.[String(vendor).toLowerCase()]
  return row === undefined ? undefined : Object.freeze({ ...row })
}

/**
 * The mapping between two vendors for one parameter (or every parameter when
 * `param` is omitted). Unknown vendors or parameters are reported as errors,
 * never guessed.
 *
 * @param {string} from - source vendor id.
 * @param {string} to - target vendor id.
 * @param {string} [param] - canonical parameter id; omit for every parameter.
 * @returns {{ error: string } | { from: object; to: object; rows: object[] }}
 */
export function translate(from, to, param) {
  const fromVendor = describeVendor(String(from))
  if (fromVendor === undefined) {
    return { error: `unknown vendor "${from}" (supported: ${vendorIds().join(', ')})` }
  }
  const toVendor = describeVendor(String(to))
  if (toVendor === undefined) {
    return { error: `unknown vendor "${to}" (supported: ${vendorIds().join(', ')})` }
  }
  const params = param === undefined ? PARAMS : [String(param)]
  for (const entry of params) {
    if (TABLE[entry] === undefined) {
      return { error: `unknown parameter "${entry}" (supported: ${PARAMS.join(', ')})` }
    }
  }
  const rows = params.map(entry => ({
    param: entry,
    from: { ...TABLE[entry][fromVendor.id] },
    to: { ...TABLE[entry][toVendor.id] },
  }))
  return { from: { ...fromVendor }, to: { ...toVendor }, rows }
}

/**
 * Apply a row's declared value transform (upstream `*_VALUE_TRANSFORMS`).
 * Unknown transform kinds pass the value through untouched.
 * @param {{ transform?: { kind: string, min: number, max: number } } | undefined} row - one table row.
 * @param {unknown} value - the standard request value.
 * @returns {unknown} the transformed value.
 */
function applyTransform(row, value) {
  if (row?.transform?.kind !== 'clamp' || typeof value !== 'number' || Number.isNaN(value)) return value
  return Math.max(row.transform.min, Math.min(row.transform.max, value))
}

/**
 * Convert an OpenAI-style standard request into one vendor's wire request.
 * Port of GPT-Rosetta-Stone `RosettaStone.convert_request`: mapped parameters
 * keep their standard names translated to the vendor spelling, unsupported
 * parameters are dropped with a warning (upstream `warnings.warn`), and value
 * transforms (e.g. the ERNIE temperature clamp) apply in place. Unknown
 * vendors throw, exactly like the upstream `UnsupportedProviderError`.
 *
 * @param {Record<string, unknown>} request - standard request; only the
 *   canonical fields of {@link PARAMS} are considered.
 * @param {string} targetVendor - vendor id to convert for.
 * @returns {{ result: Record<string, unknown>; warnings: string[] }}
 */
export function transformRequest(request, targetVendor) {
  const vendor = describeVendor(String(targetVendor))
  if (vendor === undefined) {
    throw new Error(`unsupported provider: ${targetVendor}. supported providers: ${vendorIds().join(', ')}`)
  }
  const result = /** @type {Record<string, unknown>} */ ({})
  const warnings = []
  for (const param of PARAMS) {
    if (!Object.hasOwn(request, param)) continue
    const row = TABLE[param][vendor.id]
    if (row.supported === false || row.name === null) {
      warnings.push(`parameter "${param}" is not supported by ${vendor.id} and was dropped`)
      continue
    }
    result[row.name] = applyTransform(row, request[param])
  }
  return { result, warnings }
}

export { VENDORS, TABLE }
