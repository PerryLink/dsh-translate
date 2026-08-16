// Five-language README sync gate: every README must carry the same number of
// `## ` sections as the English source, document the same configuration-table
// keys, and state the install command. Section headings may be translated;
// the English file is the source of truth.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const FILES = ['README.md', 'README.zh.md', 'README.es.md', 'README.pt.md', 'README.hi.md']
const REQUIRED_CONFIG_KEYS = ['enabled', 'repair.enabled', 'repair.toolNames', 'repair.strategies.escapeRepair', 'repair.strategies.trailingComma', 'repair.strategies.truncationClosure', 'repair.strategies.fieldCompletion', 'repair.maxSteps', 'diffMaxChars', 'diffMaxEntries', 'registerCommand', 'registerTool']

const sectionCount = (/** @type {string} */ text) => (text.match(/^## /gmu) ?? []).length
const contents = FILES.map(file => readFileSync(path.join(root, file), 'utf8'))
const [source] = contents
const failures = []
const expectedSections = sectionCount(source)

for (let i = 1; i < FILES.length; i++) {
  const text = contents[i]
  if (text === undefined) continue
  if (sectionCount(text) !== expectedSections) {
    failures.push(`${FILES[i]}: ${sectionCount(text)} '## ' sections, expected ${expectedSections}`)
  }
  if (!text.includes('dsh plugin --profile web add dsh-translate')) {
    failures.push(`${FILES[i]} is missing the install command`)
  }
  for (const key of REQUIRED_CONFIG_KEYS) {
    if (!text.includes(`\`${key}\``)) failures.push(`${FILES[i]} is missing the config key \`${key}\``)
  }
}
if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`readme-sync: all ${FILES.length} READMEs share ${expectedSections} sections, the install command, and ${REQUIRED_CONFIG_KEYS.length} config keys`)
