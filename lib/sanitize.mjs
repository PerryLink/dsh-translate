/**
 * Pure sanitization for display and session-log data.
 *
 * The repair layer only logs DIFFS, never the full before/after JSON payloads.
 * These functions bound one diff's entries and each fragment so a hostile or
 * accidentally huge payload cannot flood the session log. Both are pure and
 * total: any input (including lone surrogates and non-string values) is
 * coerced to a safe bounded string.
 *
 * @module dsh-translate/lib/sanitize
 */

/** Marker appended when a fragment is cut. */
const ELLIPSIS = '\u2026'

/**
 * Bound one text fragment for display/logging.
 * @param {unknown} value - the fragment; non-strings are stringified.
 * @param {number} maxChars - inclusive maximum length.
 * @returns {string} the bounded fragment.
 */
export function sanitizeText(value, maxChars) {
  if (!Number.isFinite(maxChars) || maxChars <= 0) return ''
  let text
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    text = String(value)
  }
  if (text === undefined) text = 'undefined'
  if (text.length <= maxChars) return text
  return `${text.slice(0, Math.max(0, maxChars - 1))}${ELLIPSIS}`
}

/**
 * Bound one repair diff for display/logging: fragments are cut to
 * `maxChars` and the entry list is cut to `maxEntries`. The returned
 * `truncated` flag records that the bounded form is not the complete diff,
 * so consumers never mistake it for one.
 *
 * @param {unknown} diff - raw edit entries from lib/fix.mjs.
 * @param {{ maxChars?: number, maxEntries?: number }} [options] - bounds.
 * @returns {{ entries: object[], truncated: boolean }} the sanitized diff.
 */
export function sanitizeDiff(diff, options = {}) {
  const maxChars = typeof options.maxChars === 'number' && Number.isFinite(options.maxChars) && options.maxChars > 0 ? options.maxChars : 200
  const maxEntries = typeof options.maxEntries === 'number' && Number.isFinite(options.maxEntries) && options.maxEntries > 0 ? options.maxEntries : 50
  const entries = Array.isArray(diff) ? diff : []
  const kept = entries.slice(0, maxEntries)
  return {
    truncated: entries.length > maxEntries,
    entries: kept.map(entry => ({
      op: sanitizeText(entry?.op ?? 'unknown', maxChars),
      path: sanitizeText(entry?.path ?? '', maxChars),
      before: sanitizeText(entry?.before ?? '', maxChars),
      after: sanitizeText(entry?.after ?? '', maxChars),
    })),
  }
}
