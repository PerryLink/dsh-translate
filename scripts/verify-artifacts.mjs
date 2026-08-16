// Verify the shipped artifacts: the ESM host face must import under plain
// Node (no bundler, no tsx), the bundle patch and docs must be present, and
// the pure lib modules must export their documented functions.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const required = [
  'index.mjs',
  'types.d.ts',
  'lib/rosetta.mjs',
  'lib/fix.mjs',
  'lib/sanitize.mjs',
  'cordis.patch.yml',
  'ARCHITECTURE.md',
  'CHANGELOG.md',
  'SECURITY.md',
]
for (const rel of required) {
  if (!existsSync(path.join(root, rel))) throw new Error(`missing artifact: ${rel}`)
}

// 1. Syntax-check the host face (plain Node parse; no execution).
const { execFileSync } = await import('node:child_process')
execFileSync(process.execPath, ['--check', path.join(root, 'index.mjs')], { stdio: 'inherit' })

// 2. The ESM host face must import under plain Node and expose the plugin contract.
const index = await import(pathToFileURL(path.join(root, 'index.mjs')).href)
if (typeof index.apply !== 'function' || index.name !== 'dsh-translate') {
  throw new Error('index.mjs exports an unexpected plugin face')
}

// 3. The pure lib modules must export their documented functions.
const rosetta = await import(pathToFileURL(path.join(root, 'lib/rosetta.mjs')).href)
const fix = await import(pathToFileURL(path.join(root, 'lib/fix.mjs')).href)
const sanitize = await import(pathToFileURL(path.join(root, 'lib/sanitize.mjs')).href)
for (const fn of ['vendorIds', 'paramList', 'translate', 'transformRequest']) {
  if (typeof rosetta[fn] !== 'function') throw new Error(`lib/rosetta.mjs is missing export ${fn}`)
}
for (const fn of ['extractJsonFromText', 'validateJsonValue', 'validateSchema', 'repairJsonText']) {
  if (typeof fix[fn] !== 'function') throw new Error(`lib/fix.mjs is missing export ${fn}`)
}
for (const fn of ['sanitizeText', 'sanitizeDiff']) {
  if (typeof sanitize[fn] !== 'function') throw new Error(`lib/sanitize.mjs is missing export ${fn}`)
}

console.log('artifacts OK: syntax + ESM import + lib exports present')
