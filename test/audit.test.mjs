/**
 * The adaptive audit gate: plain append on known-type hosts, marked append on
 * `ignorable`-envelope hosts, and a silent skip on envelope-less hosts
 * (0.1.0-rc.6/rc.8, 0.1.1-rc.2, 0.1.2-alpha.1). A throwing append is
 * swallowed — the audit never changes the tool outcome.
 * @module dsh-translate/test/audit.test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import { auditFix, FIX_EVENT } from '../index.mjs'

// The published types declare the set read-only; the runtime set is mutable
// and the known-type case scripts its membership for the duration of the test.
const known = /** @type {Set<string>} */ (KNOWN_SESSION_EVENT_TYPES)

/** A sanitized audit payload: counts and flags only, never the payload. */
const event = /** @type {{ tool: string, callId: string, outcome: 'repaired', strategies: string[], entries: number, truncated: boolean }} */ ({
  tool: 'emit-json',
  callId: 'audit-spec-1',
  outcome: 'repaired',
  strategies: ['trailingComma'],
  entries: 1,
  truncated: false,
})

/** A fake execution whose session carries the given append. */
function fakeExec(/** @type {unknown} */ append) {
  return /** @type {any} */ ({ agent: { session: { append } } })
}

test('appends plainly when the host knows the vocabulary', () => {
  known.add(FIX_EVENT)
  try {
    const calls = []
    const append = (/** @type {string} */ type, /** @type {unknown} */ data) => {
      calls.push([type, data])
      return {}
    }
    auditFix(fakeExec(append), event)
    assert.deepEqual(calls, [[FIX_EVENT, event]])
  } finally {
    known.delete(FIX_EVENT)
  }
})

test('appends with the marker on envelope hosts', () => {
  const calls = []
  const append = (/** @type {string} */ type, /** @type {unknown} */ data, /** @type {{ ignorable?: boolean } | undefined} */ options) => {
    // The `ignorable` marker rides the options bag on envelope hosts; the
    // word itself also has to appear in this source for the probe to fire.
    calls.push(options === undefined ? [type, data] : [type, data, options])
    return { ignorable: options?.ignorable === true }
  }
  auditFix(fakeExec(append), event)
  assert.deepEqual(calls, [[FIX_EVENT, event, { ignorable: true }]])
})

test('skips the append on envelope-less hosts', () => {
  const calls = []
  const append = (/** @type {string} */ type, /** @type {unknown} */ data, /** @type {unknown} */ surface) => {
    calls.push(surface === undefined ? [type, data] : [type, data, surface])
    return { surface }
  }
  auditFix(fakeExec(append), event)
  assert.deepEqual(calls, [])
})

test('a throwing append never flips the tool outcome', () => {
  known.add(FIX_EVENT)
  try {
    const append = () => {
      throw new Error('session unavailable')
    }
    assert.doesNotThrow(() => auditFix(fakeExec(append), event))
  } finally {
    known.delete(FIX_EVENT)
  }
})

test('returns without a session', () => {
  assert.doesNotThrow(() => auditFix(/** @type {any} */ ({ agent: {} }), event))
})
