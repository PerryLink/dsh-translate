/**
 * JSON validation and repair strategies for DeepSeek Harness tool results.
 *
 * Ported from JSON-Schema-Enforcer-Proxy
 * (https://github.com/PerryLink/JSON-Schema-Enforcer-Proxy, Apache-2.0):
 *   - `src/json_schema_enforcer_proxy/utils.py` `extract_json_from_text`
 *     (markdown-fence extraction) -> {@link extractJsonFromText}
 *   - `src/json_schema_enforcer_proxy/core.py` `SchemaEnforcer.enforce`
 *     (validate against a declared schema, retry with a bounded budget) ->
 *     {@link repairJsonText}. The upstream retry arm re-asks an LLM; a
 *     `tools/post-execute` listener must be deterministic and must never call
 *     a model, so the retry budget became a bounded pipeline of deterministic
 *     text strategies: escape repair, trailing-comma removal, truncation
 *     closure, and required-field completion (never value fabrication).
 *   - `tests/` cases converted to `test/fix.test.mjs` regression cases.
 *
 * Validation covers the same JSON Schema keyword subset the harness tool
 * registry compiles (`@deepseek-ai/dsh-tools`): `type`, `oneOf`,
 * `properties`, `required`, `additionalProperties`, `items`, `enum`, `const`.
 * Everything here is pure and synchronous: no I/O, no Cordis services.
 *
 * @module dsh-translate/lib/fix
 */

/**
 * Extract the JSON payload out of prose, ported from the upstream
 * `extract_json_from_text`: a fenced ```json block wins; otherwise the
 * trimmed input is returned unchanged.
 * @param {string} text - raw text that may wrap JSON in a markdown fence.
 * @returns {string} the extracted payload.
 */
export function extractJsonFromText(text) {
  const fence = /```(?:json)?\s*\n?([\s\S]*?)\n?```/u
  const match = fence.exec(String(text))
  if (match !== null && match[1] !== undefined) return match[1].trim()
  return String(text).trim()
}

/**
 * Cheap pre-check: does this text plausibly carry a JSON value?
 * Only `{`/`[` roots are attempted; prose around the payload is the
 * extract step's job, not the repair step's.
 * @param {string} text - trimmed candidate text.
 * @returns {boolean} whether repair should attempt this text.
 */
export function looksLikeJsonText(text) {
  return /^[\[{]/u.test(String(text))
}

/**
 * Parse one JSON text without ever throwing.
 * @param {string} text - candidate JSON text.
 * @returns {{ ok: true, value: unknown } | { ok: false, error: { code: string, message: string } }}
 */
export function parseJsonText(text) {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (error) {
    return { ok: false, error: { code: 'SYNTAX', message: error instanceof Error ? error.message : String(error) } }
  }
}

/** Hard cap on oneOf nesting; beyond it validation fails closed. */
const MAX_ONE_OF_DEPTH = 64

/** Hard budget on oneOf branch exploration; beyond it validation fails closed. */
const MAX_ONE_OF_BUDGET = 10_000

const SCALAR_TYPES = ['string', 'number', 'integer', 'boolean', 'null']
const CONSTRAINT_KEYWORDS = ['type', 'oneOf', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const']
const ANNOTATION_KEYWORDS = ['description', 'title', 'default', 'examples']

function isPlainObject(/** @type {unknown} */ value) {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Lossless finite JSON number, excluding negative zero (mirrors dsh-tools). */
function isJsonNumber(/** @type {unknown} */ value) {
  return typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)
}

/** Whether one scalar matches one declared schema type (mirrors dsh-tools). */
function scalarMatches(/** @type {string} */ type, /** @type {unknown} */ value) {
  switch (type) {
    case 'string': return typeof value === 'string'
    case 'number': return isJsonNumber(value)
    case 'integer': return isJsonNumber(value) && Number.isInteger(value)
    case 'boolean': return typeof value === 'boolean'
    case 'null': return value === null
    default: return false
  }
}

/**
 * Iterative deep equality for lossless JSON values (stack-safe for deep
 * nesting; only plain objects and arrays are descended).
 * @param {unknown} left - first value.
 * @param {unknown} right - second value.
 * @returns {boolean} whether the two values are structurally equal.
 */
function deepEqual(/** @type {unknown} */ left, /** @type {unknown} */ right) {
  const stack = /** @type {any[][]} */ ([[left, right]])
  for (let task = stack.pop(); task !== undefined; task = stack.pop()) {
    const [a, b] = task
    if (Object.is(a, b)) continue
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      for (let index = 0; index < a.length; index++) stack.push([a[index], b[index]])
      continue
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      const aKeys = Object.keys(a)
      const bKeys = Object.keys(b)
      if (aKeys.length !== bKeys.length) return false
      for (const key of aKeys) {
        if (!Object.hasOwn(b, key)) return false
        stack.push([a[key], b[key]])
      }
      continue
    }
    return false
  }
  return true
}

/**
 * Validate one value against one schema node of the supported subset.
 * Iterative and stack-safe; hostile deep nesting cannot overflow the stack,
 * and hostile oneOf fan-out is bounded by a shared branch budget so an
 * exponential schema cannot burn the process.
 *
 * @param {Record<string, any>} schema - one JSON Schema node (already shape-checked by
 *   {@link validateSchema}).
 * @param {unknown} value - the value to validate.
 * @param {number} [depth] - oneOf nesting depth, capped so hostile schemas
 *   cannot overflow the call stack.
 * @param {{ count: number }} [budget] - shared oneOf branch budget (internal).
 * @returns {string[]} violations in validation order; empty when valid.
 */
export function validateJsonValue(schema, value, depth = 0, budget = undefined) {
  const left = budget ?? { count: MAX_ONE_OF_BUDGET }
  if (depth > MAX_ONE_OF_DEPTH) return ['validation depth exceeded (oneOf nesting)']
  if (left.count <= 0) return ['validation budget exceeded (oneOf branching)']
  const violations = []
  const stack = /** @type {any[]} */ ([{ node: schema, value, path: '#' }])
  for (let task = stack.pop(); task !== undefined; task = stack.pop()) {
    const { node, value: current, path } = task
    if (node === null || typeof node !== 'object') continue
    if (Object.hasOwn(node, 'oneOf')) {
      let matches = 0
      for (const branch of node.oneOf) {
        left.count -= 1
        const branchViolations = validateJsonValue(branch, current, depth + 1, left)
        if (left.count <= 0) return ['validation budget exceeded (oneOf branching)']
        if (branchViolations.length === 0) matches += 1
      }
      if (matches !== 1) {
        violations.push(`"${path}" must match exactly one oneOf branch (matched ${matches})`)
      }
      continue
    }
    if (node.type !== undefined && !scalarMatches(node.type, current)
      && !(node.type === 'object' && isPlainObject(current))
      && !(node.type === 'array' && Array.isArray(current))) {
      violations.push(`"${path}" must be a ${node.type}`)
      continue
    }
    if (node.type === 'object' && isPlainObject(current)) {
      const required = Array.isArray(node.required) ? node.required : []
      for (const key of required) {
        if (!Object.hasOwn(current, key)) violations.push(`missing required property "${key}" at "${path}"`)
      }
      const properties = isPlainObject(node.properties) ? node.properties : {}
      for (const [key, sub] of Object.entries(properties)) {
        if (Object.hasOwn(current, key)) stack.push({ node: sub, value: current[key], path: `${path}/${key}` })
      }
      if (node.additionalProperties === false) {
        for (const key of Object.keys(current)) {
          if (!Object.hasOwn(properties, key)) {
            violations.push(`"${path}/${key}" is not a declared property (additionalProperties: false)`)
          }
        }
      }
      continue
    }
    if (node.type === 'array' && Array.isArray(current)) {
      if (node.items !== undefined) {
        for (let index = 0; index < current.length; index++) {
          stack.push({ node: node.items, value: current[index], path: `${path}/${index}` })
        }
      }
      continue
    }
    if (Array.isArray(node.enum)) {
      let matched = false
      for (const entry of node.enum) {
        if (deepEqual(entry, current)) {
          matched = true
          break
        }
      }
      if (!matched) violations.push(`"${path}" does not match any enum value`)
    }
    if (node.const !== undefined && !deepEqual(node.const, current)) {
      violations.push(`"${path}" must equal the declared const`)
    }
  }
  return violations
}

/**
 * Shape-check one user-supplied schema against the supported keyword subset.
 * Mirrors the harness's `assertSupportedJsonSchema` strictness so a broken
 * schema fails loudly instead of validating nothing.
 *
 * @param {unknown} schema - candidate JSON Schema.
 * @returns {string[]} violations; empty when the schema is usable.
 */
export function validateSchema(schema) {
  const violations = []
  if (!isPlainObject(schema)) {
    return ['schema must be a plain JSON object']
  }
  const stack = /** @type {any[]} */ ([{ node: schema, path: '#', seen: new Set() }])
  for (let task = stack.pop(); task !== undefined; task = stack.pop()) {
    const { node, path, seen } = task
    if (!isPlainObject(node)) {
      violations.push(`${path} must be a schema object`)
      continue
    }
    if (seen.has(node)) {
      violations.push(`${path} is circular`)
      continue
    }
    seen.add(node)
    const keys = Object.keys(node)
    for (const key of keys) {
      if (CONSTRAINT_KEYWORDS.includes(key) || ANNOTATION_KEYWORDS.includes(key)) continue
      violations.push(`${path}.${key} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const)`)
    }
    if (Object.hasOwn(node, 'type') && Object.hasOwn(node, 'oneOf')) {
      violations.push(`${path} cannot declare both type and oneOf`)
    }
    if (node.type !== undefined && !SCALAR_TYPES.includes(node.type) && node.type !== 'object' && node.type !== 'array') {
      violations.push(`${path}.type must be string/number/integer/boolean/null/object/array`)
    }
    if (node.oneOf !== undefined) {
      if (!Array.isArray(node.oneOf) || node.oneOf.length < 2 || node.oneOf.some((/** @type {any} */ branch) => !isPlainObject(branch))) {
        violations.push(`${path}.oneOf must be an array of at least two schema objects`)
      } else {
        for (let index = 0; index < node.oneOf.length; index++) {
          stack.push({ node: node.oneOf[index], path: `${path}.oneOf[${index}]`, seen })
        }
      }
    }
    if (node.properties !== undefined && !isPlainObject(node.properties)) {
      violations.push(`${path}.properties must be an object of schemas`)
    } else if (node.properties !== undefined) {
      for (const [key, sub] of Object.entries(node.properties)) {
        stack.push({ node: sub, path: `${path}.properties.${key}`, seen })
      }
    }
    if (node.items !== undefined && !isPlainObject(node.items)) {
      violations.push(`${path}.items must be a schema object`)
    } else if (node.items !== undefined) {
      stack.push({ node: node.items, path: `${path}.items`, seen })
    }
    if (node.required !== undefined && (!Array.isArray(node.required) || node.required.some((/** @type {any} */ key) => typeof key !== 'string'))) {
      violations.push(`${path}.required must be an array of strings`)
    } else if (Array.isArray(node.required)) {
      const declared = isPlainObject(node.properties) ? node.properties : {}
      for (const key of node.required) {
        if (!Object.hasOwn(declared, key)) violations.push(`${path}.required names "${key}" which is not in properties`)
      }
    }
    if (node.additionalProperties !== undefined && typeof node.additionalProperties !== 'boolean') {
      violations.push(`${path}.additionalProperties must be a boolean`)
    }
  }
  return violations
}

/** Whether a schema node declares any constraint (vs pure annotations). */
function hasConstraints(/** @type {any} */ node) {
  if (node === null || typeof node !== 'object') return false
  return CONSTRAINT_KEYWORDS.some(keyword => Object.hasOwn(node, keyword))
}

/** Whether a schema root declares object/array shape (used for post-execute intent). */
export function isContainerSchema(/** @type {any} */ schema) {
  return schema?.type === 'object' || schema?.type === 'array'
    || Array.isArray(schema?.oneOf) && schema.oneOf.some((/** @type {any} */ branch) => branch?.type === 'object' || branch?.type === 'array')
}

const CONTROL_ESCAPES = new Map([
  ['\b', '\\b'], ['\t', '\\t'], ['\n', '\\n'], ['\f', '\\f'], ['\r', '\\r'],
])

/**
 * One structural scan of candidate JSON text: string/escape state, unmatched
 * container stack, raw control characters inside strings, and trailing
 * commas directly before a closer. One O(n) pass feeds every text strategy.
 *
 * @param {string} text - candidate JSON text.
 * @returns {{ inString: boolean, escapedAtEnd: boolean, stack: string[],
 *   controlChars: Array<{ index: number, char: string }>,
 *   trailingCommas: number[], mismatch: boolean }}
 */
function analyzeJsonText(text) {
  let inString = false
  let escaped = false
  const stack = []
  const controlChars = []
  const trailingCommas = []
  let mismatch = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
        // A raw control char right after a backslash is still invalid JSON.
        if (char < ' ') controlChars.push({ index, char })
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      } else if (char < ' ') {
        controlChars.push({ index, char })
      }
      continue
    }
    if (char === '"') {
      inString = true
    } else if (char === '{' || char === '[') {
      stack.push(char)
    } else if (char === '}' || char === ']') {
      const open = stack.at(-1)
      const matching = char === '}' ? '{' : '['
      if (open === matching) {
        stack.pop()
        // Trailing comma: walk back over whitespace from the char before the closer.
        let cursor = index - 1
        while (cursor >= 0 && ' \t\r\n'.includes(text[cursor])) cursor--
        if (cursor >= 0 && text[cursor] === ',') trailingCommas.push(cursor)
      } else {
        mismatch = true
      }
    }
  }
  return { inString, escapedAtEnd: escaped && inString, stack, controlChars, trailingCommas, mismatch }
}

/**
 * Apply every enabled text strategy to one broken JSON text. Returns the
 * repaired candidate, the strategy names actually applied, and the raw edits
 * (before/after fragments are real JSON text slices; sanitize before logging).
 *
 * @param {string} text - broken JSON text (fences already extracted).
 * @param {{ strategies: Record<string, boolean>, maxSteps: number }} options - `{ strategies, maxSteps }` with one boolean per
 *   strategy and a positive application budget.
 * @returns {{ text: string, edits: object[], strategies: string[], truncated: boolean }}
 */
function applyTextStrategies(text, options) {
  let current = text
  const edits = []
  const strategies = []
  let truncated = false
  let steps = options.maxSteps
  let changed = true
  while (changed && steps > 0) {
    changed = false
    steps -= 1
    const scan = analyzeJsonText(current)
    const replacements = []
    if (options.strategies.escapeRepair && scan.controlChars.length > 0) {
      for (const { index, char } of scan.controlChars) {
        const escape = CONTROL_ESCAPES.get(char) ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
        replacements.push({ index, length: 1, before: char, after: escape })
        edits.push({ op: 'escape', path: `text@${index}`, before: char, after: escape })
      }
      strategies.push('escapeRepair')
      changed = true
    }
    if (options.strategies.trailingComma && scan.trailingCommas.length > 0) {
      for (const index of scan.trailingCommas) {
        replacements.push({ index, length: 1, before: ',', after: '' })
        edits.push({ op: 'strip', path: `text@${index}`, before: ',', after: '' })
      }
      strategies.push('trailingComma')
      changed = true
    }
    if (replacements.length > 0) {
      current = applyReplacements(current, replacements)
    }
    if (options.strategies.truncationClosure && (scan.inString || scan.stack.length > 0) && !scan.mismatch) {
      let suffix = ''
      if (scan.inString) {
        // A lone trailing backslash would swallow the closing quote: escape it
        // so the repaired string keeps the literal backslash it already had.
        suffix = `${scan.escapedAtEnd ? '\\' : ''}"`
      }
      for (let depth = scan.stack.length - 1; depth >= 0; depth--) {
        suffix += scan.stack[depth] === '{' ? '}' : ']'
      }
      current = `${current}${suffix}`
      edits.push({ op: 'close', path: `text@${text.length}`, before: '', after: suffix })
      strategies.push('truncationClosure')
      truncated = true
      changed = true
    }
  }
  return { text: current, edits, strategies, truncated }
}

/** Apply sorted index replacements to one string in a single reverse pass. */
function applyReplacements(/** @type {string} */ text, /** @type {any[]} */ replacements) {
  const sorted = [...replacements].sort((a, b) => b.index - a.index)
  let result = text
  for (const { index, length, after } of sorted) {
    result = result.slice(0, index) + after + result.slice(index + length)
  }
  return result
}

/**
 * Complete an object against its declared schema: every missing `required`
 * property on an EXISTING object is filled with `null` and flagged in the
 * edit list. Missing parents are never created and declared values are never
 * invented 鈥?null is a placeholder, not data. Iterative and stack-safe.
 *
 * @param {unknown} value - parsed JSON value (mutated in place).
 * @param {Record<string, any>} schema - the declared schema root.
 * @returns {{ edits: any[] }} the fills applied.
 */
export function fillRequiredFields(value, schema) {
  const edits = []
  const stack = /** @type {any[]} */ ([{ value, node: schema, path: '#' }])
  for (let task = stack.pop(); task !== undefined; task = stack.pop()) {
    const { value: current, node, path } = task
    if (node === null || typeof node !== 'object' || Object.hasOwn(node, 'oneOf')) continue
    if (node.type === 'object' && isPlainObject(current)) {
      const required = Array.isArray(node.required) ? node.required : []
      for (const key of required) {
        if (!Object.hasOwn(current, key)) {
          current[key] = null
          edits.push({ op: 'fill', path: `${path}/${key}`, before: '', after: 'null' })
        }
      }
      const properties = isPlainObject(node.properties) ? node.properties : {}
      for (const [key, sub] of Object.entries(properties)) {
        if (Object.hasOwn(current, key)) stack.push({ value: current[key], node: sub, path: `${path}/${key}` })
      }
      continue
    }
    if (node.type === 'array' && Array.isArray(current) && node.items !== undefined) {
      for (let index = 0; index < current.length; index++) {
        stack.push({ value: current[index], node: node.items, path: `${path}/${index}` })
      }
    }
  }
  return { edits }
}

/**
 * Repair one broken JSON text against one declared schema, or return a
 * structured error without ever fabricating data. Deterministic pipeline:
 * extract (caller) -> parse; on syntax failure apply escape repair, trailing
 * comma removal, and truncation closure once per pass; on success complete
 * missing required fields; the result must validate against the schema (when
 * it declares constraints) or the original text is returned untouched.
 *
 * @param {string} text - the broken JSON text (already fence-extracted).
 * @param {Record<string, any>} schema - schema root (shape-checked by the caller).
 * @param {{ strategies: Record<string, boolean>, maxSteps: number }} options - `{ strategies, maxSteps }`.
 * @returns {{ ok: boolean, repaired: string | null, diff: object[],
 *   strategies: string[], truncated: boolean, validated: boolean,
 *   error: { code: string, message: string } | null }}
 */
export function repairJsonText(text, schema, options) {
  const strategies = options.strategies
  const edits = []
  const applied = /** @type {string[]} */ ([])
  let truncated = false
  let current = text
  let parsed = parseJsonText(current)
  if (!parsed.ok) {
    const pass = applyTextStrategies(current, { strategies, maxSteps: options.maxSteps })
    if (pass.strategies.length === 0) {
      return {
        ok: false, repaired: null, diff: [], strategies: applied, truncated,
        validated: false, error: { code: 'UNREPAIRABLE', message: parsed.error.message },
      }
    }
    current = pass.text
    truncated = pass.truncated
    edits.push(...pass.edits)
    applied.push(...pass.strategies)
    parsed = parseJsonText(current)
    if (!parsed.ok) {
      return {
        ok: false, repaired: null, diff: edits, strategies: applied, truncated,
        validated: false, error: { code: 'UNREPAIRABLE', message: parsed.error.message },
      }
    }
  }
  let value = parsed.value
  if (strategies.fieldCompletion) {
    const fills = fillRequiredFields(value, schema)
    if (fills.edits.length > 0) {
      edits.push(...fills.edits)
      applied.push('fieldCompletion')
    }
  }
  const constraints = hasConstraints(schema)
  const violations = constraints ? validateJsonValue(schema, value) : []
  if (constraints && violations.length > 0) {
    // Fail closed: never hand back JSON that still violates the schema.
    return {
      ok: false, repaired: null, diff: edits, strategies: applied, truncated,
      validated: true, error: { code: 'SCHEMA_VIOLATION', message: violations.join('; ') },
    }
  }
  const changed = edits.length > 0
  const repaired = changed ? JSON.stringify(value, null, 2) : current
  return {
    ok: true, repaired, diff: edits, strategies: applied, truncated,
    validated: constraints, error: null,
  }
}

