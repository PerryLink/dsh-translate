// scripts/loader-runner.mjs — real Loader composition runner (community
// five-layer model, layer 4). An independent process boots a real Context,
// mounts the vendored Loader with the Include builtin, reads the given
// cordis.yml (service rows + plugin row + config), then asserts the plugin's
// contributions through the authoritative registries and executes one real
// behavior. Config is applied by the Loader, so the expected outcome proves
// the config in the file was honored.
//
// Usage: node scripts/loader-runner.mjs <cordis.yml> repaired|unrepairable
// Exit 0 prints DSH_LOADER_RESULT <json>; any assertion or load failure exits
// non-zero with the reason on stderr (used by the invalid-config and
// default-export regression cases).

import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { CallId } from '../test/call-id.mjs'
import { SessionId } from '@deepseek-ai/dsh-session'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const configArgument = process.argv[2]
const expected = process.argv[3]
if (configArgument === undefined || (expected !== 'repaired' && expected !== 'unrepairable')) {
  console.error('usage: loader-runner.mjs <cordis.yml> repaired|unrepairable')
  process.exit(2)
}

const configPath = resolve(configArgument)
// Resolve bare package rows from this repository's dependency tree so the
// composition works with config files written anywhere (e.g. a temp dir).
const configRequire = createRequire(resolve(import.meta.dirname, '../package.json'))

const ctx = new Context()
try {
  ctx.baseUrl = `${pathToFileURL(dirname(configPath)).href}/`
  await ctx.plugin(Loader)
  ctx.loader.internal = /** @type {any} */ ({
    version: 'v2',
    async import(specifier) {
      if (specifier.startsWith('file:')) return import(specifier)
      if (specifier.startsWith('node:')) return import(specifier)
      const absolute = /^([a-zA-Z]:)?[\\/]/u.test(specifier)
      return import(pathToFileURL(absolute ? specifier : configRequire.resolve(specifier)).href)
    },
  })
  ctx.loader.builtins.include = Include
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()
  await rethrowFirstFailedRow()

  // Authoritative registries carry the plugin's contributions.
  if (ctx.tools.get('fix_json') === undefined) {
    throw new Error('Loader composition: fix_json tool is missing from the tools registry')
  }
  const session = ctx.sessions.create(SessionId('dsh-translate-loader-runner'))
  const agent = /** @type {any} */ ({
    id: session.id,
    options: { provider: 'deepseek', model: 'demo-model' },
    session,
    inbox: {},
    status: 'idle',
    ctx,
    cancel: () => undefined,
    whenIdle: async () => undefined,
    runMaintenance: async (task) => task(new AbortController().signal),
    send: () => undefined,
    followup: () => undefined,
    steer: () => undefined,
    inject: () => undefined,
  })
  if (ctx.commands.list(agent).find(entry => entry.name === 'translate') === undefined) {
    throw new Error('Loader composition: /translate command is missing from the commands registry')
  }

  // Real behavior: the /translate command through the real commands service.
  // execute signature: (agent, line, images, signal).
  const execution = await ctx.commands.execute(agent, '/translate vendors', [], new AbortController().signal)
  const text = execution?.result?.text ?? ''
  if (!text.includes('openai')) {
    throw new Error(`Loader composition: /translate vendors returned ${JSON.stringify(execution?.result)}`)
  }

  // Real behavior: fix_json through the real tools registry. The trailing
  // comma is repairable only while the trailingComma strategy is enabled,
  // so the expected outcome pins the config that the Loader actually applied.
  const result = await ctx.tools.execute({
    callId: CallId('dsh-translate-loader-runner'),
    name: 'fix_json',
    arguments: { text: '{"a": 1,}', schema: { type: 'object', properties: { a: { type: 'integer' } }, required: ['a'], additionalProperties: false } },
    agent,
    signal: new AbortController().signal,
  })
  const ok = result.isError === false && /** @type {any} */ (result.value)?.ok === true
  const observed = expected === 'repaired' ? ok : !ok
  if (!observed) {
    throw new Error(`Loader composition: expected ${expected}, got ${JSON.stringify({ isError: result.isError, value: result.value })}`)
  }

  const summary = {
    tools: ctx.tools.schemas().map(schema => schema.name),
    command: text.split('\n')[0],
    repairOk: ok,
  }
  process.stdout.write(`DSH_LOADER_RESULT ${JSON.stringify(summary)}\n`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  await ctx.fiber.dispose()
}

/**
 * Re-throw the first FAILED loader row's own reason.
 *
 * `cordis-plugin-loader` 1.0.6 dropped the failure surface `await()` had in 1.0.4: the old body
 * collected every `entry._await()` outcome and threw the single failure (or an AggregateError),
 * while the new body only drains `_initTask || fiber.inertia` and so resolves even when a row's
 * `apply` threw. Without this the negative composition regressions report the runner's own
 * downstream symptom instead of the reason they assert. `fiber.await()` still rethrows the
 * stored error, so the reason comes back without touching the logger.
 *
 * `DSH_LOADER_RUNNER_NO_RETHROW=1` disables it for re-measurement only.
 */
async function rethrowFirstFailedRow() {
  if (process.env.DSH_LOADER_RUNNER_NO_RETHROW === '1') return
  const failures = []
  for (const entry of ctx.loader.entries()) {
    // FiberState.FAILED === 3 (const enum, erased at runtime).
    if (entry?.fiber?.state !== 3) continue
    try {
      await entry.fiber.await()
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error)))
    }
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length > 1) throw new AggregateError(failures, 'loader fibers failed')
}
