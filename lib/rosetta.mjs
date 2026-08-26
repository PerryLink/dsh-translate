/**
 * Vendor parameter translation table for DeepSeek Harness.
 *
 * The mapping data lives in `rosetta-data.json` (11 vendors × 13 canonical
 * parameters) and is bundled with the package. `loadRosettaData` swaps in an
 * external file with the same shape, so the table stays data-driven and
 * community-contributable without a code release; the bundled default keeps
 * the zero-setup path.
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
 * The pure functions below read the current module-level data snapshot
 * (bundled by default, replaced by {@link loadRosettaData}); no network, no
 * Cordis services — the bundled JSON is read synchronously at module load.
 *
 * @module dsh-translate/lib/rosetta
 */

import { readFileSync } from 'node:fs'

/** The bundled default document, parsed once at module load. */
const BUNDLED = /** @type {Record<string, any>} */ (JSON.parse(readFileSync(new URL('./rosetta-data.json', import.meta.url), 'utf8')))

/** One vendor in the table. */
let VENDORS = /** @type {Array<{ id: string, name: string, apiStyle: string, source: string }>} */ (BUNDLED.vendors)

/** Canonical parameter ids understood by this table. */
let PARAMS = /** @type {string[]} */ (BUNDLED.params)

/**
 * `TABLE[param][vendor]` describes one vendor's spelling and semantics for one
 * canonical parameter. `name` is the wire name; `supported: false` marks a
 * parameter the vendor has no equivalent for (it is dropped with a warning by
 * `transformRequest`); `transform` optionally rewrites the value (upstream
 * `*_VALUE_TRANSFORMS`); `notes` records semantic differences.
 */
let TABLE = /** @type {Record<string, Record<string, any>>} */ (BUNDLED.table)

/**
 * Validate one loaded rosetta data document against the structural contract:
 * `vendors` is a non-empty array of `{id,name,apiStyle,source}`; `params` is a
 * non-empty string array; `table` has one entry per param and per vendor, each
 * carrying a `supported` flag. Invalid data fails loud — a wrong override must
 * never silently produce wrong answers.
 * @param {unknown} data - the parsed document.
 * @returns {{ vendors: Array<{ id: string, name: string, apiStyle: string, source: string }>, params: string[], table: Record<string, Record<string, any>> }} the validated data.
 */
export function validateRosettaData(data) {
  const doc = /** @type {Record<string, any>} */ (data)
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new TypeError('dsh-translate: rosetta data must be a JSON object')
  }
  const vendors = doc.vendors
  if (!Array.isArray(vendors) || vendors.length === 0) {
    throw new TypeError('dsh-translate: rosetta data vendors must be a non-empty array')
  }
  for (const vendor of vendors) {
    if (vendor === null || typeof vendor !== 'object'
      || typeof vendor.id !== 'string' || typeof vendor.name !== 'string'
      || typeof vendor.apiStyle !== 'string' || typeof vendor.source !== 'string') {
      throw new TypeError('dsh-translate: each rosetta vendor needs id/name/apiStyle/source strings')
    }
  }
  const params = doc.params
  if (!Array.isArray(params) || params.length === 0 || params.some(param => typeof param !== 'string')) {
    throw new TypeError('dsh-translate: rosetta data params must be a non-empty string array')
  }
  const table = doc.table
  if (table === null || typeof table !== 'object' || Array.isArray(table)) {
    throw new TypeError('dsh-translate: rosetta data table must be an object')
  }
  const vendorIdsSet = new Set(vendors.map((/** @type {{ id: string }} */ vendor) => vendor.id))
  for (const param of params) {
    const row = table[param]
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new TypeError(`dsh-translate: rosetta data table.${param} must be an object`)
    }
    for (const vendor of vendorIdsSet) {
      const cell = row[vendor]
      if (cell === undefined || cell === null || typeof cell !== 'object' || typeof cell.supported !== 'boolean') {
        throw new TypeError(`dsh-translate: rosetta data table.${param}.${vendor} needs a supported flag`)
      }
    }
  }
  return { vendors, params, table }
}

/**
 * Replace the module-level rosetta data with an external snapshot. `source` is
 * either a file path (read + parsed) or an already-parsed data object. The
 * replacement must satisfy {@link validateRosettaData}; a valid swap replaces
 * the table in place, so every subsequent lookup uses the new data. Throws on
 * any invalid input (the previous snapshot stays in effect).
 * @param {string | unknown} source - file path or data object.
 * @returns {Readonly<{ vendors: ReadonlyArray<{ id: string, name: string, apiStyle: string, source: string }>, params: ReadonlyArray<string>, table: Record<string, Record<string, any>> }>} the snapshot now in effect.
 */
export function loadRosettaData(source) {
  const data = typeof source === 'string'
    ? JSON.parse(readFileSync(source, 'utf8'))
    : source
  const validated = validateRosettaData(data)
  VENDORS = validated.vendors
  PARAMS = validated.params
  TABLE = validated.table
  return rosettaData()
}

/**
 * A frozen snapshot of the current rosetta data (vendors/params/table).
 * @returns {Readonly<{ vendors: ReadonlyArray<{ id: string, name: string, apiStyle: string, source: string }>, params: ReadonlyArray<string>, table: Record<string, Record<string, any>> }>} the current data.
 */
export function rosettaData() {
  return Object.freeze({
    vendors: Object.freeze([...VENDORS]),
    params: Object.freeze([...PARAMS]),
    table: TABLE,
  })
}

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
