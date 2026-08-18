/**
 * Pathological-input suite (U6): malformed and truncated JSON stays bounded
 * inside the strategy budget and never hangs the repair layer. Hard per-test
 * timeouts enforce "completes, does not hang" independently of assertions.
 * @module dsh-translate/test/pathological.test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import { extractJsonFromText, looksLikeJsonText, repairJsonText } from '../lib/fix.mjs'
import * as plugin from '../index.mjs'

const ALL_STRATEGIES = { escapeRepair: true, trailingComma: true, truncationClosure: true, fieldCompletion: true }
const HARD_TIMEOUT = 10_000

async function mountHarness() {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const session = ctx.sessions.create(SessionId('dsh-translate-pathological'))
  ctx.provide('systemPrompt', { tools: () => () => undefined, section: () => () => undefined })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  const agent = {
    id: session.id, options: {}, session, inbox: {}, status: 'idle', ctx,
    cancel: () => undefined, whenIdle: async () => undefined,
    runMaintenance: async (task) => task(new AbortController().signal),
    send: () => undefined, followup: () => undefined, steer: () => undefined, inject: () => undefined,
  }
  await ctx.plugin(plugin, {})
  return ctx
}

test('a 100 KB JSON-ish flood completes with a bounded diff', { timeout: HARD_TIMEOUT }, () => {
  const big = `{"a": "${'x'.repeat(100_000)}",}`.slice(0, 100_000)
  const outcome = repairJsonText(big, { type: 'object' }, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.ok(!(outcome.ok && outcome.diff === undefined))
  assert.ok(outcome.diff !== undefined)
  assert.ok(outcome.diff.length <= 50 * 8, 'diff entries stay bounded')
})

test('a 2000-deep truncated nest closes without stack overflow', { timeout: HARD_TIMEOUT }, () => {
  const deep = '['.repeat(2000) + '1'
  const outcome = repairJsonText(deep, { type: 'array' }, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  // Either fully closed or honestly unrepairable — never a throw or a hang.
  assert.ok(outcome.ok === true || outcome.ok === false)
  assert.ok(outcome.diff !== undefined)
})

test('10k raw control characters repair under the escape strategy', { timeout: HARD_TIMEOUT }, () => {
  const control = `{"a": "${'\n'.repeat(10_000)}"}`
  const outcome = repairJsonText(control, { type: 'object' }, { strategies: ALL_STRATEGIES, maxSteps: 8 })
  assert.ok(outcome.ok === true || outcome.ok === false)
  assert.ok(outcome.diff !== undefined)
})

test('100 trailing commas stay inside a tiny strategy budget', { timeout: HARD_TIMEOUT }, () => {
  const commas = `{"a": 1${','.repeat(100)}}`
  const outcome = repairJsonText(commas, { type: 'object' }, { strategies: { escapeRepair: false, trailingComma: true, truncationClosure: false, fieldCompletion: false }, maxSteps: 2 })
  assert.equal(outcome.ok, false, 'unrepairable within the budget, not a hang')
  assert.ok((outcome.strategies ?? []).length <= 2)
})

test('a 1 MB prose payload is skipped by the fence extractor', { timeout: HARD_TIMEOUT }, () => {
  const prose = 'plain prose\n'.repeat(200_000)
  const extracted = extractJsonFromText(prose)
  assert.equal(looksLikeJsonText(extracted), false)
})

test('fix_json through the real registry stays bounded on a pathological payload', { timeout: HARD_TIMEOUT }, async () => {
  const ctx = await mountHarness()
  try {
    const result = await ctx.tools.execute({
      callId: CallId('dsh-translate-pathological'),
      name: 'fix_json',
      arguments: { text: '{"a": ' + '['.repeat(500) + '1' + ','.repeat(200) + '}' },
      signal: new AbortController().signal,
    })
    assert.equal(result.isError, false)
    assert.equal(typeof /** @type {any} */ (result.value)?.ok, 'boolean')
  } finally {
    await ctx.fiber.dispose()
  }
})
