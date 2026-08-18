/**
 * Real Loader composition suite (community five-layer model, layers 4–5):
 * an independent process mounts the Loader over a cordis.yml with real
 * service rows + the plugin row + config, proving module unwrapping, inject
 * resolution, config application, and the registry contributions — paths a
 * hand-built `ctx.plugin` assembly never exercises. Also carries the two
 * negative regressions: invalid config must fail loud for the expected
 * reason, and a default export must fail with the missing-inject reason.
 * @module dsh-translate/test/composition.test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runner = join(repositoryRoot, 'scripts', 'loader-runner.mjs')
const entry = join(repositoryRoot, 'index.mjs')

/** One cordis.yml: real service rows, then the plugin row with config. */
function configFor(pluginRow, configLines = []) {
  return [
    "- name: '@deepseek-ai/dsh-session'",
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    "- name: '@deepseek-ai/dsh-commands'",
    `- name: ${JSON.stringify(pluginRow)}`,
    ...(configLines.length > 0 ? ['  config: ', ...configLines.map(line => `    ${line}`)] : []),
    '',
  ].join('\n')
}

function runRunner(configPath, expected) {
  const result = spawnSync(process.execPath, [runner, configPath, expected], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 120_000,
  })
  if (result.error !== undefined) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

const temporaryRoot = mkdtempSync(join(tmpdir(), 'dsh-translate-loader-'))

test('Loader composition mounts the plugin and applies its config (repaired)', () => {
  const configPath = join(temporaryRoot, 'valid.yml')
  writeFileSync(configPath, configFor(pathToFileURL(entry).href))
  const evidence = runRunner(configPath, 'repaired')
  assert.equal(evidence.status, 0, `stdout:\n${evidence.stdout}\nstderr:\n${evidence.stderr}`)
  assert.match(evidence.stdout, /DSH_LOADER_RESULT/u)
  const marker = evidence.stdout.match(/DSH_LOADER_RESULT (.+)$/mu)
  const summary = JSON.parse(marker[1])
  assert.ok(summary.tools.includes('fix_json'))
  assert.match(summary.command, /openai/u)
  assert.equal(summary.repairOk, true)
})

test('Loader composition applies the special config value (unrepairable)', () => {
  const configPath = join(temporaryRoot, 'special.yml')
  writeFileSync(configPath, configFor(pathToFileURL(entry).href, [
    'repair:',
    '  strategies:',
    '    trailingComma: false',
  ]))
  const evidence = runRunner(configPath, 'unrepairable')
  assert.equal(evidence.status, 0, `stdout:\n${evidence.stdout}\nstderr:\n${evidence.stderr}`)
  const marker = evidence.stdout.match(/DSH_LOADER_RESULT (.+)$/mu)
  assert.equal(JSON.parse(marker[1]).repairOk, false)
})

test('invalid config fails loud through the Loader for the expected reason', () => {
  const cases = [
    { lines: ["enabled: 'yes'"], reason: /expected boolean/u },
    { lines: ['repair:', '  maxSteps: 0'], reason: /maxSteps/u },
  ]
  const entryUrl = pathToFileURL(entry).href
  for (const entry of cases) {
    const configPath = join(temporaryRoot, 'invalid.yml')
    writeFileSync(configPath, configFor(entryUrl, entry.lines))
    const evidence = runRunner(configPath, 'repaired')
    assert.notEqual(evidence.status, 0, `invalid config unexpectedly mounted:\n${entry.lines.join('\n')}`)
    assert.match(evidence.stderr, entry.reason, `failed for the wrong reason:\n${evidence.stderr}`)
  }
})

test('a default export fails through the Loader with the missing-inject reason', () => {
  const wrapper = join(temporaryRoot, 'default-export.mjs')
  const builtUrl = pathToFileURL(entry).href
  writeFileSync(wrapper, [
    `export { name, inject, Config, apply } from ${JSON.stringify(builtUrl)}`,
    `export { apply as default } from ${JSON.stringify(builtUrl)}`,
    '',
  ].join('\n'))
  const configPath = join(temporaryRoot, 'invalid-default.yml')
  writeFileSync(configPath, configFor(pathToFileURL(wrapper).href))
  const evidence = runRunner(configPath, 'repaired')
  assert.notEqual(evidence.status, 0, 'default-export wrapper unexpectedly mounted')
  assert.match(evidence.stderr, /without inject/u, `failed for the wrong reason:\n${evidence.stderr}`)
})

test.after(() => {
  rmSync(temporaryRoot, { recursive: true, force: true })
})
