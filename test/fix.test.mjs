/**
 * lib/fix.mjs regression suite: the upstream JSON-Schema-Enforcer-Proxy test
 * cases converted to JS, plus hostile-input coverage (deep nesting, circular
 * schemas, hostile payloads) proving the pipeline stays total.
 * @module dsh-translate/test/fix.test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractJsonFromText,
  looksLikeJsonText,
  parseJsonText,
  validateJsonValue,
  validateSchema,
  isContainerSchema,
  fillRequiredFields,
  repairJsonText,
} from '../lib/fix.mjs'

const ALL_STRATEGIES = { escapeRepair: true, trailingComma: true, truncationClosure: true, fieldCompletion: true }
const SCHEMA_OBJECT = {
  type: 'object',
  properties: { a: { type: 'integer' }, b: { type: 'string' } },
  required: ['a'],
  additionalProperties: false,
}

/** A schema whose required field accepts the null placeholder. */
const SCHEMA_NULLABLE = {
  type: 'object',
  properties: {
    a: { oneOf: [{ type: 'integer' }, { type: 'null' }] },
    b: { oneOf: [{ type: 'string' }, { type: 'null' }] },
  },
  required: ['a', 'b'],
  additionalProperties: false,
}

test('extractJsonFromText prefers a fenced json block', () => {
  assert.equal(extractJsonFromText('Here you go:\n```json\n{"a": 1}\n```\nthanks'), '{"a": 1}')
  assert.equal(extractJsonFromText('```\n[1, 2]\n```'), '[1, 2]')
})

test('extractJsonFromText returns trimmed prose unchanged without a fence', () => {
  assert.equal(extractJsonFromText('  {"a": 1}  '), '{"a": 1}')
})

test('looksLikeJsonText accepts only object/array roots', () => {
  assert.equal(looksLikeJsonText('{"a": 1}'), true)
  assert.equal(looksLikeJsonText('[1]'), true)
  assert.equal(looksLikeJsonText('"text"'), false)
  assert.equal(looksLikeJsonText('hello'), false)
})

test('parseJsonText never throws', () => {
  assert.deepEqual(parseJsonText('{"a": 1}'), { ok: true, value: { a: 1 } })
  const failure = parseJsonText('{"a": ')
  assert.equal(failure.ok, false)
  assert.equal(failure.error.code, 'SYNTAX')
})

test('validateJsonValue enforces type/required/additionalProperties', () => {
  assert.deepEqual(validateJsonValue(SCHEMA_OBJECT, { a: 1, b: 'x' }), [])
  const violations = validateJsonValue(SCHEMA_OBJECT, { b: 'x' })
  assert.equal(violations.length, 1)
  assert.match(violations[0], /missing required property "a"/u)
  const extra = validateJsonValue(SCHEMA_OBJECT, { a: 1, c: 2 })
  assert.match(extra[0], /"#\/c" is not a declared property/u)
})

test('validateJsonValue enforces enum and const with deep equality', () => {
  const schema = { type: 'object', properties: { kind: { enum: ['a', 'b'] }, lock: { const: { deep: [1] } } } }
  assert.deepEqual(validateJsonValue(schema, { kind: 'a', lock: { deep: [1] } }), [])
  assert.match(validateJsonValue(schema, { kind: 'z', lock: { deep: [1] } })[0], /enum/u)
  assert.match(validateJsonValue(schema, { kind: 'a', lock: { deep: [2] } })[0], /const/u)
})

test('validateJsonValue enforces oneOf exactly-one semantics', () => {
  const schema = { oneOf: [{ type: 'string' }, { type: 'integer' }] }
  assert.deepEqual(validateJsonValue(schema, 'x'), [])
  assert.deepEqual(validateJsonValue(schema, 1), [])
  assert.match(validateJsonValue(schema, true)[0], /exactly one oneOf/u)
})

test('validateJsonValue fails closed beyond the oneOf depth cap and branch budget', () => {
  let schema = /** @type {any} */ ({ type: 'string' })
  for (let depth = 0; depth < 100; depth++) schema = { oneOf: [schema, schema] }
  const violation = validateJsonValue(schema, 'x')[0]
  assert.match(violation, /depth exceeded|budget exceeded/u)
})

test('validateJsonValue handles deeply nested hostile values without stack overflow', () => {
  const deep = /** @type {any} */ ({})
  let cursor = deep
  for (let depth = 0; depth < 100_000; depth++) {
    cursor.next = {}
    cursor = cursor.next
  }
  const violations = validateJsonValue({ type: 'object' }, deep)
  assert.deepEqual(violations, [])
})

test('validateSchema rejects unknown keywords, both type and oneOf, and circular schemas', () => {
  assert.deepEqual(validateSchema(SCHEMA_OBJECT), [])
  assert.match(validateSchema({ pattern: 'x' })[0], /pattern is not a supported keyword/u)
  assert.match(validateSchema({ type: 'string', oneOf: [{ type: 'string' }, { type: 'integer' }] })[0], /cannot declare both type and oneOf/u)
  const circular = {}
  circular.properties = { self: circular }
  assert.match(validateSchema(circular)[0], /circular/u)
})

test('validateSchema rejects required names outside properties', () => {
  assert.match(validateSchema({ type: 'object', required: ['ghost'] })[0], /"ghost" which is not in properties/u)
})

test('isContainerSchema detects object/array/oneOf-of-container roots', () => {
  assert.equal(isContainerSchema({ type: 'object' }), true)
  assert.equal(isContainerSchema({ type: 'array' }), true)
  assert.equal(isContainerSchema({ oneOf: [{ type: 'object' }, { type: 'array' }] }), true)
  assert.equal(isContainerSchema({ type: 'string' }), false)
  assert.equal(isContainerSchema({}), false)
})

test('fillRequiredFields fills null placeholders without inventing data', () => {
  const value = /** @type {Record<string, any>} */ ({ a: 1 })
  const result = fillRequiredFields(value, SCHEMA_NULLABLE)
  assert.equal(value.a, 1)
  assert.equal(value.b, null)
  assert.equal(result.edits.length, 1)
  assert.equal(result.edits[0].op, 'fill')
  assert.equal(result.edits[0].path, '#/b')
})

test('repairJsonText removes trailing commas (upstream case)', () => {
  const schema = {
    type: 'object',
    properties: { a: { type: 'integer' }, b: { type: 'array', items: { type: 'integer' } } },
    required: ['a'],
    additionalProperties: false,
  }
  const outcome = repairJsonText('{"a": 1, "b": [1, 2,],}', schema, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.equal(outcome.ok, true)
  assert.deepEqual(JSON.parse(/** @type {string} */ (outcome.repaired)), { a: 1, b: [1, 2] })
  assert.ok(outcome.strategies.includes('trailingComma'))
})

test('repairJsonText escapes raw control characters (upstream case)', () => {
  const outcome = repairJsonText('{"a": "line1\nline2"}', { type: 'object' }, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.equal(outcome.ok, true)
  assert.deepEqual(JSON.parse(/** @type {string} */ (outcome.repaired)), { a: 'line1\nline2' })
  assert.ok(outcome.strategies.includes('escapeRepair'))
})

test('repairJsonText closes truncated containers and strings', () => {
  const truncated = repairJsonText('{"a": [1, 2', { type: 'object' }, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.equal(truncated.ok, true)
  assert.deepEqual(JSON.parse(/** @type {string} */ (truncated.repaired)), { a: [1, 2] })
  assert.equal(truncated.truncated, true)
  const cutString = repairJsonText('{"a": "unfin', { type: 'object' }, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.equal(cutString.ok, true)
  assert.deepEqual(JSON.parse(/** @type {string} */ (cutString.repaired)), { a: 'unfin' })
})

test('repairJsonText completes missing required fields and validates', () => {
  const outcome = repairJsonText('{"b": "x"}', SCHEMA_NULLABLE, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.equal(outcome.ok, true)
  assert.deepEqual(JSON.parse(/** @type {string} */ (outcome.repaired)), { b: 'x', a: null })
  assert.ok(outcome.strategies.includes('fieldCompletion'))
  assert.equal(outcome.validated, true)
})

test('repairJsonText fails closed when the null placeholder violates the schema', () => {
  // SCHEMA_OBJECT requires an integer `a`; the null placeholder cannot satisfy
  // it, so the repair must fail closed instead of fabricating a number.
  const outcome = repairJsonText('{"b": "x"}', SCHEMA_OBJECT, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.equal(outcome.ok, false)
  assert.equal((/** @type {{ code: string }} */ (outcome.error)).code, 'SCHEMA_VIOLATION')
})

test('repairJsonText fails closed on unrepaired syntax', () => {
  const outcome = repairJsonText('{not json at all', {}, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.equal(outcome.ok, false)
  assert.equal((/** @type {{ code: string }} */ (outcome.error)).code, 'UNREPAIRABLE')
  assert.equal(outcome.repaired, null)
})

test('repairJsonText fails closed when the repaired value still violates the schema', () => {
  const outcome = repairJsonText('{"a": "wrong-type"}', SCHEMA_OBJECT, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.equal(outcome.ok, false)
  assert.equal((/** @type {{ code: string }} */ (outcome.error)).code, 'SCHEMA_VIOLATION')
  assert.equal(outcome.repaired, null)
})

test('repairJsonText leaves already-valid text untouched', () => {
  const outcome = repairJsonText('{"a": 1, "b": "x"}', SCHEMA_OBJECT, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.equal(outcome.ok, true)
  assert.equal(outcome.repaired, '{"a": 1, "b": "x"}')
  assert.deepEqual(outcome.diff, [])
})

test('repairJsonText honors the strategy budget', () => {
  const outcome = repairJsonText('{"a": 1,,,}', { type: 'object' }, { strategies: { escapeRepair: false, trailingComma: true, truncationClosure: false, fieldCompletion: false }, maxSteps: 1 })
  assert.equal(outcome.ok, false)
})

