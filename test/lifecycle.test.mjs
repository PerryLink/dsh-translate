/**
 * Lifecycle and export-contract suite: the HMR-safety test (dispose the
 * contributing fiber, re-query the authoritative registries), the
 * default-export guard (module namespace + Loader unwrap round-trip), and
 * the tool three-interface assertion (model schema + canonical value +
 * content blocks) through the real ToolRuntime.
 * @module dsh-translate/test/lifecycle.test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { CallId } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import * as plugin from '../index.mjs'

/** Structurally complete fake agent over a real session. */
function makeAgent(/** @type {any} */ session) {
  return {
    id: session.id,
    options: { provider: 'deepseek', model: 'demo-model' },
    session,
    inbox: {},
    status: 'idle',
    ctx: new Context(),
    cancel: () => undefined,
    whenIdle: async () => undefined,
    runMaintenance: async (/** @type {(signal: AbortSignal) => Promise<unknown>} */ task) => task(new AbortController().signal),
    send: () => undefined,
    followup: () => undefined,
    steer: () => undefined,
    inject: () => undefined,
  }
}

async function mountHarness() {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const session = ctx.sessions.create(SessionId('dsh-translate-lifecycle'))
  ctx.provide('systemPrompt', { tools: () => () => undefined, section: () => () => undefined })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  const agent = /** @type {any} */ (makeAgent(session))
  const pluginFiber = await ctx.plugin(plugin, {})
  return { ctx, session, agent, pluginFiber }
}

// ---------------------------------------------------------------------------
// C2: the function-plugin namespace must survive Loader unwrapping
// ---------------------------------------------------------------------------

test('module carries no default export and Loader unwrap round-trips the namespace', () => {
  assert.equal('default' in plugin, false)
  const loader = Object.create(Loader.prototype)
  const unwrapped = loader.unwrapExports(plugin)
  assert.equal(unwrapped, plugin)
  assert.equal(unwrapped.name, 'dsh-translate')
  assert.deepEqual(unwrapped.inject, ['commands', 'tools'])
  assert.ok(unwrapped.Config !== undefined)
  assert.equal(typeof unwrapped.apply, 'function')
})

// ---------------------------------------------------------------------------
// C1: disposing the contributing fiber removes every registry contribution
// ---------------------------------------------------------------------------

test('disposing the contributing fiber removes fix_json and /translate from the registries', async () => {
  const harness = await mountHarness()
  try {
    assert.ok(harness.ctx.tools.get('fix_json') !== undefined)
    assert.ok(harness.ctx.commands.list(harness.agent).find(entry => entry.name === 'translate') !== undefined)

    await harness.pluginFiber.dispose()

    assert.equal(harness.ctx.tools.get('fix_json'), undefined)
    assert.equal(harness.ctx.commands.list(harness.agent).find(entry => entry.name === 'translate'), undefined)
  } finally {
    await harness.ctx.fiber.dispose()
  }
})

// ---------------------------------------------------------------------------
// U2: the tool three interfaces in one assertion through the real runtime
// ---------------------------------------------------------------------------

test('fix_json keeps the model schema, canonical value, and content blocks stable', async () => {
  const harness = await mountHarness()
  try {
    const schemas = harness.ctx.tools.schemas()
    const schema = schemas.find(entry => entry.name === 'fix_json')
    assert.ok(schema !== undefined)
    // The registry's normalized model projection: `required: true` collapses
    // into the top-level required list, and the annotation-only `json` type
    // is dropped.
    assert.deepEqual(schema.parameters, {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The broken JSON text (a markdown ```json fence is extracted automatically).' },
        schema: { description: 'Optional JSON Schema root (subset: type/oneOf/properties/required/additionalProperties/items/enum/const). Omit or pass {} for syntax-only repair.' },
        strategies: {
          type: 'object',
          description: 'Optional per-strategy switches; all default to true.',
          properties: {
            escapeRepair: { type: 'boolean', description: 'Escape raw control characters inside strings.' },
            trailingComma: { type: 'boolean', description: 'Remove commas directly before a closing bracket.' },
            truncationClosure: { type: 'boolean', description: 'Close an unclosed string or container cut off by truncation.' },
            fieldCompletion: { type: 'boolean', description: 'Complete missing required fields with null placeholders.' },
          },
          additionalProperties: false,
        },
      },
      required: ['text'],
    })

    const result = await harness.ctx.tools.execute({
      callId: CallId('dsh-translate-three-interfaces'),
      name: 'fix_json',
      arguments: { text: '{"a": 1,}' },
      agent: harness.agent,
      signal: new AbortController().signal,
    })
    assert.equal(result.isError, false)
    // Canonical value: the program-facing repair outcome (pretty-printed
    // repaired text, sanitized diff entries).
    assert.deepEqual(result.value, {
      ok: true,
      repaired: '{\n  "a": 1\n}',
      diff: [{ op: 'strip', path: 'text@7', before: ',', after: '' }],
      strategies: ['trailingComma'],
      truncated: false,
      validated: false,
    })
    // Content blocks: the model-facing projection, rendered from the value.
    assert.ok(Array.isArray(result.content))
    assert.deepEqual(result.content[0], {
      type: 'text',
      text: 'fix_json repaired the value (strategies: trailingComma):\n{\n  "a": 1\n}',
    })
  } finally {
    await harness.ctx.fiber.dispose()
  }
})
