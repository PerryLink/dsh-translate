/**
 * Assembly suite: the real tool pipeline with a real Context, SessionStore,
 * Session, ToolRuntime, and Commands runtime — only the model-side and the
 * session driver are scripted. Covers the post-execute repair listener, the
 * fix_json tool, the /translate registration, and the session audit events.
 * @module dsh-translate/test/index.test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from './call-id.mjs'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import { handleTranslateCommand, translatePair, translateOverview, repairIntended, resolveConfig } from '../index.mjs'
import * as plugin from '../index.mjs'

let callCounter = 0

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

async function mountHarness(config = {}) {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const session = ctx.sessions.create(SessionId('dsh-translate-harness'))
  session.append('turn/start', { turn: 1 })
  ctx.provide('systemPrompt', { tools: () => () => undefined, section: () => () => undefined })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  const agent = makeAgent(session)
  await ctx.plugin(plugin, config)
  return { ctx, session, agent: /** @type {any} */ (agent) }
}

async function callTool(/** @type {any} */ harness, /** @type {string} */ name, /** @type {unknown} */ args) {
  callCounter += 1
  return harness.ctx.tools.execute({
    callId: CallId(`dsh-translate-spec-${callCounter}`),
    name,
    arguments: args,
    agent: harness.agent,
    signal: new AbortController().signal,
  })
}

// ---------------------------------------------------------------------------
// resolveConfig
// ---------------------------------------------------------------------------

test('resolveConfig fills defaults and freezes the policy', () => {
  const resolved = resolveConfig({})
  assert.equal(resolved.enabled, true)
  assert.equal(resolved.repair.enabled, true)
  assert.deepEqual(resolved.repair.toolNames, [])
  assert.equal(resolved.repair.strategies.escapeRepair, true)
  assert.equal(resolved.repair.maxSteps, 8)
  assert.equal(resolved.diffMaxChars, 200)
  assert.equal(resolved.diffMaxEntries, 50)
  assert.equal(resolved.registerCommand, true)
  assert.equal(resolved.registerTool, true)
})

test('resolveConfig fails loud on out-of-bounds values', () => {
  assert.throws(() => resolveConfig({ repair: { maxSteps: 0 } }), /maxSteps/u)
  assert.throws(() => resolveConfig({ diffMaxChars: 0 }), /diffMaxChars/u)
  assert.throws(() => resolveConfig({ repair: { strategies: { escapeRepair: 'yes' } } }), /escapeRepair/u)
})

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test('repairIntended accepts string/json roots and opted-in names only', () => {
  assert.equal(repairIntended({ type: 'string' }, 'x', []), true)
  assert.equal(repairIntended({}, 'x', []), true)
  assert.equal(repairIntended({ type: 'object', properties: {} }, 'x', []), false)
  assert.equal(repairIntended({ type: 'object', properties: {} }, 'x', ['x']), true)
  assert.equal(repairIntended({ type: 'number' }, 'x', []), false)
})

test('translatePair maps a parameter and reports unknown vendors', () => {
  const mapped = translatePair('openai', 'ernie', 'max_tokens')
  assert.equal(mapped.kind, 'success')
  assert.match(mapped.text, /max_tokens → max_output_tokens/u)
  assert.equal(translatePair('nope', 'openai').kind, 'error')
})

test('handleTranslateCommand routes subcommands', () => {
  assert.match(handleTranslateCommand('').text, /dsh-translate/u)
  assert.match(handleTranslateCommand('vendors').text, /openai/u)
  assert.match(handleTranslateCommand('params').text, /temperature/u)
  assert.equal(handleTranslateCommand('wat').kind, 'error')
  assert.equal(handleTranslateCommand('a b c d').kind, 'error')
})

test('translateOverview mentions the usage forms', () => {
  const text = translateOverview()
  assert.match(text, /translate <from> <to>/u)
  assert.match(text, /deepseek/u)
})

// ---------------------------------------------------------------------------
// Post-execute repair through the real registry
// ---------------------------------------------------------------------------

test('repairs a broken JSON string from a json-rooted tool; the adaptive gate skips the audit on envelope-less hosts', async () => {
  const harness = await mountHarness()
  await harness.ctx.plugin({
    name: 'emit-json-fixture',
    inject: ['tools'],
    apply(ctx) {
      ctx.tools.register(defineTool({
        name: 'emit-json',
        description: 'fixture',
        parameters: {},
        output: {
          schema: { type: 'json' },
          render() {
            return []
          },
        },
        async execute() {
          return '{"a": 1,}'
        },
      }))
    },
  })
  const result = await callTool(harness, 'emit-json', {})
  assert.equal(result.isError, false)
  assert.deepEqual(result.value, { a: 1 })
  // rc.2-shaped host: the `translate/fix` type is outside its known set and
  // its append has no `ignorable` envelope → the adaptive gate skips the
  // audit append (the gate itself is unit-tested in audit.test.mjs).
  assert.equal(harness.session.events.filter(event => event.type === 'translate/fix').length, 0)
})

test('repairs a truncated JSON string from a string-rooted tool into repaired text', async () => {
  const harness = await mountHarness()
  await harness.ctx.plugin({
    name: 'emit-text-fixture',
    inject: ['tools'],
    apply(ctx) {
      ctx.tools.register(defineTool({
        name: 'emit-text',
        description: 'fixture',
        parameters: {},
        output: {
          schema: { type: 'string' },
          render() {
            return []
          },
        },
        async execute() {
          return '{"b": [1, 2'
        },
      }))
    },
  })
  const result = await callTool(harness, 'emit-text', {})
  assert.equal(result.isError, false)
  assert.equal(typeof result.value, 'string')
  assert.deepEqual(JSON.parse(result.value), { b: [1, 2] })
})

test('leaves already-valid JSON text untouched', async () => {
  const harness = await mountHarness()
  await harness.ctx.plugin({
    name: 'emit-clean-fixture',
    inject: ['tools'],
    apply(ctx) {
      ctx.tools.register(defineTool({
        name: 'emit-clean',
        description: 'fixture',
        parameters: {},
        output: {
          schema: { type: 'string' },
          render() {
            return []
          },
        },
        async execute() {
          return '{"ok": true}'
        },
      }))
    },
  })
  const result = await callTool(harness, 'emit-clean', {})
  assert.equal(result.isError, false)
  assert.equal(result.value, '{"ok": true}')
  assert.equal(harness.session.events.filter(event => event.type === 'translate/fix').length, 0)
})

test('never flips a failed result into a success', async () => {
  const harness = await mountHarness()
  await harness.ctx.plugin({
    name: 'emit-broken-object-fixture',
    inject: ['tools'],
    apply(ctx) {
      ctx.tools.register(defineTool({
        name: 'emit-broken-object',
        description: 'fixture',
        parameters: {},
        output: {
          schema: {
            type: 'object',
            properties: { a: { type: 'integer', required: true } },
            additionalProperties: false,
          },
          render() {
            return []
          },
        },
        async execute() {
          // The fixture intentionally returns a schema-violating string: the
          // registry must fail it before post-execute ever sees a success.
          return /** @type {any} */ ('{"a": 1,}')
        },
      }))
    },
  })
  const result = await callTool(harness, 'emit-broken-object', {})
  assert.equal(result.isError, true)
})

test('passes non-JSON strings and non-string values through untouched', async () => {
  const harness = await mountHarness()
  await harness.ctx.plugin({
    name: 'emit-prose-fixture',
    inject: ['tools'],
    apply(ctx) {
      ctx.tools.register(defineTool({
        name: 'emit-prose',
        description: 'fixture',
        parameters: {},
        output: {
          schema: { type: 'string' },
          render() {
            return []
          },
        },
        async execute() {
          return 'plain prose answer'
        },
      }))
      ctx.tools.register(defineTool({
        name: 'emit-number',
        description: 'fixture',
        parameters: {},
        output: {
          schema: { type: 'integer' },
          render() {
            return []
          },
        },
        async execute() {
          return 42
        },
      }))
    },
  })
  assert.equal((await callTool(harness, 'emit-prose', {})).value, 'plain prose answer')
  assert.equal((await callTool(harness, 'emit-number', {})).value, 42)
})

test('repair.enabled false and enabled false disable the listener and surfaces', async () => {
  const off = await mountHarness({ enabled: false })
  assert.equal(off.ctx.commands.list(off.agent).find(descriptor => descriptor.name === 'translate'), undefined)
  assert.equal(off.ctx.tools.get('fix_json'), undefined)

  const repairOff = await mountHarness({ repair: { enabled: false } })
  await repairOff.ctx.plugin({
    name: 'emit-json-off-fixture',
    inject: ['tools'],
    apply(ctx) {
      ctx.tools.register(defineTool({
        name: 'emit-json-off',
        description: 'fixture',
        parameters: {},
        output: {
          schema: { type: 'json' },
          render() {
            return []
          },
        },
        async execute() {
          return '{"a": 1,}'
        },
      }))
    },
  })
  const result = await callTool(repairOff, 'emit-json-off', {})
  assert.equal(result.isError, false)
  assert.equal(result.value, '{"a": 1,}')
})

// ---------------------------------------------------------------------------
// fix_json tool through the real registry
// ---------------------------------------------------------------------------

test('fix_json repairs broken text and returns a bounded diff', async () => {
  const harness = await mountHarness()
  const result = await callTool(harness, 'fix_json', {
    text: '```json\n{"a": 1,}\n```',
    schema: { type: 'object', properties: { a: { type: 'integer' } }, required: ['a'], additionalProperties: false },
  })
  assert.equal(result.isError, false)
  assert.equal(result.value.ok, true)
  assert.deepEqual(JSON.parse(result.value.repaired), { a: 1 })
  assert.ok(result.value.strategies.includes('trailingComma'))
})

test('fix_json fills missing required fields with null placeholders', async () => {
  const harness = await mountHarness()
  const result = await callTool(harness, 'fix_json', {
    text: '{}',
    schema: {
      type: 'object',
      properties: { a: { oneOf: [{ type: 'integer' }, { type: 'null' }] } },
      required: ['a'],
      additionalProperties: false,
    },
  })
  assert.equal(result.isError, false)
  assert.equal(result.value.ok, true)
  assert.deepEqual(JSON.parse(result.value.repaired), { a: null })
})

test('fix_json reports INVALID_SCHEMA for unsupported keywords', async () => {
  const harness = await mountHarness()
  const result = await callTool(harness, 'fix_json', { text: '{}', schema: { pattern: 'x' } })
  assert.equal(result.isError, false)
  assert.equal(result.value.ok, false)
  assert.equal(result.value.error.code, 'INVALID_SCHEMA')
})

test('fix_json reports SCHEMA_VIOLATION instead of fabricating data', async () => {
  const harness = await mountHarness()
  const result = await callTool(harness, 'fix_json', {
    text: '{"a": "not-an-integer"}',
    schema: { type: 'object', properties: { a: { type: 'integer' } }, required: ['a'], additionalProperties: false },
  })
  assert.equal(result.isError, false)
  assert.equal(result.value.ok, false)
  assert.equal(result.value.error.code, 'SCHEMA_VIOLATION')
})

test('fix_json rejects prose that carries no JSON', async () => {
  const harness = await mountHarness()
  const result = await callTool(harness, 'fix_json', { text: 'no json here' })
  assert.equal(result.isError, false)
  assert.equal(result.value.ok, false)
  assert.equal(result.value.error.code, 'NOT_JSON_TEXT')
})

// ---------------------------------------------------------------------------
// /translate command registration
// ---------------------------------------------------------------------------

test('registers the /translate command with the commands runtime', async () => {
  const harness = await mountHarness()
  const descriptor = harness.ctx.commands.list(harness.agent).find(entry => entry.name === 'translate')
  assert.ok(descriptor !== undefined)
  assert.match(descriptor.description, /translation/u)
})
