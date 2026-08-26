/**
 * `dsh-translate` — vendor parameter translation and deterministic JSON
 * repair for DeepSeek Harness.
 *
 * Two surfaces, one bundle:
 *   - the `/translate` command: vendor/parameter overview and pairwise
 *     parameter mapping (11 vendors × 13 canonical parameters, data from
 *     `lib/rosetta.mjs`);
 *   - the repair layer: a `tools/post-execute` listener plus the `fix_json`
 *     tool. The listener re-parses JSON text that successful tool results
 *     carry as strings (string-rooted or unconstrained `json`-rooted output
 *     schemas, or tools opted in through `repair.toolNames`), repairs broken
 *     syntax deterministically (escape repair, trailing-comma removal,
 *     truncation closure, required-field completion), and replaces the
 *     canonical value. Repair never fabricates data, never flips a failed
 *     result into a success, and always calls `next()` unless it claims the
 *     call with a validated replacement.
 *
 * JS form (pure host): root `index.mjs` is the only host face.
 *
 * @module dsh-translate
 */

import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  describeVendor,
  vendorIds,
  paramList,
  loadRosettaData,
  translate as translateRows,
} from './lib/rosetta.mjs'
import {
  extractJsonFromText,
  looksLikeJsonText,
  parseJsonText,
  repairJsonText,
  validateJsonValue,
  validateSchema,
  isContainerSchema,
} from './lib/fix.mjs'
import { sanitizeDiff } from './lib/sanitize.mjs'

export const name = 'dsh-translate'

/** Hard services: the command surface and the tool registry. */
export const inject = ['commands', 'tools']

/** Raw plugin config — every field optional; {@link resolveConfig} fills defaults. */
export const Config = z.object({
  /** Master switch; the plugin registers nothing when false. */
  enabled: z.boolean().default(true),
  /** The post-execute repair layer. */
  repair: z.object({
    /** Repair layer switch. */
    enabled: z.boolean().default(true),
    /**
     * Extra tool names to consider for repair on top of tools whose output
     * schema root is string-rooted or unconstrained (`json`-rooted).
     */
    toolNames: z.array(z.string()).default([]),
    /** One switch per deterministic strategy. */
    strategies: z.object({
      /** Escape raw control characters inside strings. */
      escapeRepair: z.boolean().default(true),
      /** Remove commas directly before a closing bracket. */
      trailingComma: z.boolean().default(true),
      /** Close an unclosed string or container cut off by truncation. */
      truncationClosure: z.boolean().default(true),
      /** Complete missing required fields with explicit null placeholders. */
      fieldCompletion: z.boolean().default(true),
    }).default({ escapeRepair: true, trailingComma: true, truncationClosure: true, fieldCompletion: true }),
    /** Strategy application budget (passes of the repair loop). */
    maxSteps: z.number().default(8),
  }).default({
    enabled: true,
    toolNames: [],
    strategies: { escapeRepair: true, trailingComma: true, truncationClosure: true, fieldCompletion: true },
    maxSteps: 8,
  }),
  /** Cap on one logged diff fragment, in characters. */
  diffMaxChars: z.number().default(200),
  /** Cap on logged diff entries. */
  diffMaxEntries: z.number().default(50),
  /** Register the `/translate` command. */
  registerCommand: z.boolean().default(true),
  /** Register the `fix_json` tool. */
  registerTool: z.boolean().default(true),
  /**
   * Optional path to an external rosetta data file (same shape as the bundled
   * `lib/rosetta-data.json`). When set, it replaces the built-in mapping table
   * at mount; an invalid file fails the mount loudly.
   */
  rosettaDataPath: z.string(),
})

/**
 * Resolve raw config to a frozen runtime policy, re-judging every default and
 * bound so programmatic mounts that bypass the Schemastery loader still fail
 * loud instead of running with hidden defaults.
 * @param {object | undefined} raw - raw loader config.
 * @returns {{ enabled: boolean, repair: { enabled: boolean, toolNames: readonly string[], strategies: { escapeRepair: boolean, trailingComma: boolean, truncationClosure: boolean, fieldCompletion: boolean }, maxSteps: number }, diffMaxChars: number, diffMaxEntries: number, registerCommand: boolean, registerTool: boolean, rosettaDataPath: string | undefined }} the frozen resolved config.
 */
export function resolveConfig(raw) {
  const config = /** @type {Record<string, any>} */ (raw ?? {})
  const enabled = config.enabled ?? true
  if (typeof enabled !== 'boolean') throw new TypeError('dsh-translate: config.enabled must be a boolean')

  const repairRaw = config.repair ?? {}
  const repairEnabled = repairRaw.enabled ?? true
  if (typeof repairEnabled !== 'boolean') throw new TypeError('dsh-translate: config.repair.enabled must be a boolean')

  const toolNames = Array.isArray(repairRaw.toolNames) ? [...repairRaw.toolNames] : []
  for (const entry of toolNames) {
    if (typeof entry !== 'string') throw new TypeError('dsh-translate: config.repair.toolNames entries must be strings')
  }

  const strategiesRaw = repairRaw.strategies ?? {}
  const strategies = {
    escapeRepair: strategiesRaw.escapeRepair ?? true,
    trailingComma: strategiesRaw.trailingComma ?? true,
    truncationClosure: strategiesRaw.truncationClosure ?? true,
    fieldCompletion: strategiesRaw.fieldCompletion ?? true,
  }
  for (const [key, value] of Object.entries(strategies)) {
    if (typeof value !== 'boolean') throw new TypeError(`dsh-translate: config.repair.strategies.${key} must be a boolean`)
  }

  const maxSteps = repairRaw.maxSteps ?? 8
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 64) {
    throw new TypeError('dsh-translate: config.repair.maxSteps must be an integer between 1 and 64')
  }

  const diffMaxChars = config.diffMaxChars ?? 200
  if (!Number.isInteger(diffMaxChars) || diffMaxChars < 1) {
    throw new TypeError('dsh-translate: config.diffMaxChars must be a positive integer')
  }
  const diffMaxEntries = config.diffMaxEntries ?? 50
  if (!Number.isInteger(diffMaxEntries) || diffMaxEntries < 1) {
    throw new TypeError('dsh-translate: config.diffMaxEntries must be a positive integer')
  }

  const registerCommand = config.registerCommand ?? true
  if (typeof registerCommand !== 'boolean') throw new TypeError('dsh-translate: config.registerCommand must be a boolean')
  const registerTool = config.registerTool ?? true
  if (typeof registerTool !== 'boolean') throw new TypeError('dsh-translate: config.registerTool must be a boolean')

  const rosettaDataPath = config.rosettaDataPath
  if (rosettaDataPath !== undefined && (typeof rosettaDataPath !== 'string' || rosettaDataPath.trim().length === 0)) {
    throw new TypeError('dsh-translate: config.rosettaDataPath must be a non-empty string')
  }

  return Object.freeze({
    enabled,
    repair: Object.freeze({
      enabled: repairEnabled,
      toolNames: Object.freeze(toolNames),
      strategies: Object.freeze(strategies),
      maxSteps,
    }),
    diffMaxChars,
    diffMaxEntries,
    registerCommand,
    registerTool,
    rosettaDataPath: rosettaDataPath === undefined ? undefined : rosettaDataPath,
  })
}

/** The `translate/fix` session audit event type. */
export const FIX_EVENT = 'translate/fix'

/**
 * Append one repair audit event; a failed append never changes the tool
 * outcome. Two-argument form: the pinned 0.1.1-rc.2 peers have no append
 * envelope, and the two-argument call typechecks against rc.2 and newer.
 * @param {import('@deepseek-ai/dsh-tools').ToolRunContext} exec - the calling execution.
 * @param {{ tool: string, callId: string, outcome: 'repaired' | 'unrepairable' | 'skipped' | 'valid', strategies: string[], entries: number, truncated: boolean, errorCode?: string, maxFragmentChars?: number }} event - the sanitized audit payload (counts and flags only).
 */
export function auditFix(exec, event) {
  const session = exec.agent?.session
  if (session === undefined) return
  try {
    session.append(FIX_EVENT, event)
  } catch {
    // The tool result still logs the model-visible content; the audit append
    // is supplementary and must not flip an outcome that already ran.
  }
}

/** Whether a raw JSON Schema node declares any constraint keyword. */
function hasConstraints(/** @type {unknown} */ schema) {
  if (schema === null || typeof schema !== 'object') return false
  return ['type', 'oneOf', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const']
    .some(keyword => Object.hasOwn(schema, keyword))
}

/**
 * Whether this tool's canonical output may reach the repair layer: the root
 * schema is string-rooted (the value IS a JSON document serialized as text),
 * unconstrained (`json`-rooted — annotation-only schema), or the tool is
 * opted in by name.
 * @param {unknown} schema - raw output schema root.
 * @param {string} toolName - executed tool name.
 * @param {readonly string[]} toolNames - configured opt-in names.
 * @returns {boolean} whether repair may consider this result.
 */
export function repairIntended(schema, toolName, toolNames) {
  if (toolNames.includes(toolName)) return true
  if (schema === true) return true
  if (schema === null || typeof schema !== 'object') return false
  const root = /** @type {Record<string, unknown>} */ (schema)
  if (root['type'] === 'string') return true
  return !hasConstraints(schema)
}

/**
 * One deterministic repair attempt for a JSON-text canonical value.
 * @param {string} text - the raw string value (fences not yet extracted).
 * @param {unknown} schema - the tool's raw output schema root.
 * @param {{ escapeRepair: boolean, trailingComma: boolean, truncationClosure: boolean, fieldCompletion: boolean }} strategies - one boolean per strategy.
 * @param {number} maxSteps - strategy application budget.
 * @returns {{ claimed: boolean, decision?: { kind: 'accept', value: unknown },
 *   audit: { outcome: 'repaired' | 'unrepairable' | 'skipped' | 'valid',
 *   strategies: string[], entries: number, truncated: boolean,
 *   errorCode?: string } }}
 */
export function attemptRepair(text, schema, strategies, maxSteps) {
  const extracted = extractJsonFromText(text)
  if (!looksLikeJsonText(extracted)) {
    return {
      claimed: false,
      audit: { outcome: 'skipped', strategies: [], entries: 0, truncated: false },
    }
  }
  // Container-rooted and unconstrained (json-rooted) schemas receive the
  // PARSED object; string roots receive the repaired text. Either way the
  // registry re-validates the replacement against the tool's schema.
  const container = isContainerSchema(schema) || !hasConstraints(schema)
  const validationSchema = /** @type {Record<string, unknown>} */ (container && hasConstraints(schema) ? schema : {})

  const parsedFirst = parseJsonText(extracted)
  if (parsedFirst.ok) {
    const violations = hasConstraints(validationSchema) ? validateJsonValue(validationSchema, parsedFirst.value) : []
    if (violations.length === 0) {
      // Already valid JSON: nothing to repair.
      return {
        claimed: false,
        audit: { outcome: 'valid', strategies: [], entries: 0, truncated: false },
      }
    }
  }

  const outcome = repairJsonText(extracted, validationSchema, { strategies, maxSteps })
  const diff = sanitizeDiff(outcome.diff)
  if (!outcome.ok) {
    return {
      claimed: false,
      audit: {
        outcome: 'unrepairable',
        strategies: outcome.strategies,
        entries: diff.entries.length,
        truncated: diff.truncated,
        errorCode: outcome.error?.code,
      },
    }
  }
  // The replacement must survive the registry's re-validation against the
  // tool's output schema: container roots receive the parsed object, string
  // roots receive the repaired text.
  let value
  if (container) {
    const parsed = parseJsonText(/** @type {string} */ (outcome.repaired))
    if (!parsed.ok) {
      return {
        claimed: false,
        audit: {
          outcome: 'unrepairable',
          strategies: outcome.strategies,
          entries: diff.entries.length,
          truncated: diff.truncated,
          errorCode: 'SYNTAX',
        },
      }
    }
    value = parsed.value
  } else {
    value = outcome.repaired
  }
  return {
    claimed: true,
    decision: { kind: 'accept', value },
    audit: {
      outcome: 'repaired',
      strategies: outcome.strategies,
      entries: diff.entries.length,
      truncated: diff.truncated || outcome.truncated,
    },
  }
}

// ---------------------------------------------------------------------------
// Command text helpers (pure, unit-tested; the /translate handler delegates).
// ---------------------------------------------------------------------------

/** Overview listing vendors and parameters. */
export function translateOverview() {
  const vendors = vendorIds().map(id => `- ${id} (${vendorName(id)})`).join('\n')
  const params = paramList().join(', ')
  return [
    'dsh-translate: vendor parameter translation table.',
    '',
    'Usage:',
    '  /translate                this overview',
    '  /translate vendors        list vendors',
    '  /translate params         list canonical parameters',
    '  /translate <from> <to> [param]   pairwise mapping',
    '',
    'Vendors:',
    vendors,
    '',
    `Canonical parameters: ${params}`,
  ].join('\n')
}

/** Vendor list. */
export function translateVendorList() {
  return vendorIds().map(id => `${id} — ${vendorName(id)}`).join('\n')
}

/** Resolve one vendor's display name, total on unknown ids. */
function vendorName(/** @type {string} */ id) {
  const found = /** @type {{ name: string } | undefined} */ (describeVendor(id))
  return found?.name ?? ''
}

/** Parameter list. */
export function translateParamList() {
  return paramList().join('\n')
}

/**
 * Pairwise mapping text for one parameter (or every parameter).
 * @param {string} from - source vendor id.
 * @param {string} to - target vendor id.
 * @param {string} [param] - canonical parameter id.
 * @returns {{ kind: 'success' | 'error', text: string }}
 */
export function translatePair(from, to, param) {
  const result = translateRows(from, to, param)
  if ('error' in result) return { kind: 'error', text: result.error }
  const fromVendor = /** @type {{ id: string, name: string }} */ (result.from)
  const toVendor = /** @type {{ id: string, name: string }} */ (result.to)
  const rows = /** @type {{ param: string, from: { name: unknown, supported: unknown }, to: { name: unknown, supported: unknown, notes?: string } }[]} */ (result.rows)
  const lines = [`${fromVendor.id} (${fromVendor.name}) → ${toVendor.id} (${toVendor.name}):`]
  for (const row of rows) {
    const fromName = row.from.supported === false ? '(unsupported)' : String(row.from.name ?? '(n/a)')
    const toName = row.to.supported === false ? '(unsupported)' : String(row.to.name ?? '(n/a)')
    const notes = row.to.notes === undefined ? '' : ` — ${row.to.notes}`
    lines.push(`  ${row.param}: ${fromName} → ${toName}${notes}`)
  }
  return { kind: 'success', text: lines.join('\n') }
}

/**
 * Handle one `/translate` invocation's raw input.
 * @param {string} rawInput - text after the command name.
 * @returns {{ kind: 'success' | 'error', text: string }}
 */
export function handleTranslateCommand(rawInput) {
  const tokens = String(rawInput ?? '').trim().split(/\s+/u).filter(token => token !== '')
  if (tokens.length === 0) return { kind: 'success', text: translateOverview() }
  if (tokens.length === 1) {
    if (tokens[0] === 'vendors') return { kind: 'success', text: translateVendorList() }
    if (tokens[0] === 'params') return { kind: 'success', text: translateParamList() }
    return { kind: 'error', text: `unknown subcommand "${tokens[0]}"; use vendors, params, or "<from> <to> [param]"` }
  }
  if (tokens.length === 2 || tokens.length === 3) {
    return translatePair(tokens[0], tokens[1], tokens[2])
  }
  return { kind: 'error', text: 'usage: /translate [vendors | params | <from> <to> [param]]' }
}

// ---------------------------------------------------------------------------
// The fix_json tool.
// ---------------------------------------------------------------------------

/**
 * Build the `fix_json` tool definition.
 * @param {{ repair: { strategies: { escapeRepair: boolean, trailingComma: boolean, truncationClosure: boolean, fieldCompletion: boolean }, maxSteps: number }, diffMaxChars: number, diffMaxEntries: number }} resolved - resolved config.
 * @returns {object} the defineTool definition.
 */
export function fixJsonTool(resolved) {
  // checkJs cannot reconcile defineTool's generic inference across the two
  // peer type copies in this JS-form repo; runtime behavior is covered by
  // the assembly tests, and types.d.ts documents the tool's surface.
  return defineTool(/** @type {any} */ ({
    name: 'fix_json',
    description:
      'Repair one broken JSON text against an optional JSON Schema using deterministic strategies only (escape repair, trailing-comma removal, truncation closure, required-field completion). Never invents values: missing required fields are filled with explicit null placeholders, and the result must validate against the schema or the original text is returned untouched with a structured error.',
    parameters: {
      text: { type: 'string', description: 'The broken JSON text (a markdown ```json fence is extracted automatically).', required: true },
      schema: { type: 'json', description: 'Optional JSON Schema root (subset: type/oneOf/properties/required/additionalProperties/items/enum/const). Omit or pass {} for syntax-only repair.' },
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
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          repaired: { type: 'string', description: 'The repaired JSON text (ok: true only).' },
          diff: {
            type: 'array',
            description: 'Sanitized edit entries: op, path, before, after fragments (bounded).',
            items: {
              type: 'object',
              properties: {
                op: { type: 'string' },
                path: { type: 'string' },
                before: { type: 'string' },
                after: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
          strategies: { type: 'array', items: { type: 'string' }, description: 'Strategies actually applied.' },
          truncated: { type: 'boolean', description: 'Whether the diff/repair carries truncation markers.' },
          validated: { type: 'boolean', description: 'Whether the result was validated against schema constraints.' },
          error: {
            type: 'object',
            description: 'Structured failure (ok: false only).',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      render(/** @type {any} */ _args, /** @type {any} */ value) {
        const result = /** @type {{ ok: boolean, repaired?: string, strategies?: string[], error?: { code: string, message: string } }} */ (value)
        if (!result.ok) {
          return [{ type: 'text', text: `fix_json failed (${result.error?.code ?? 'unknown'}): ${result.error?.message ?? ''}` }]
        }
        return [{ type: 'text', text: `fix_json repaired the value${result.strategies !== undefined && result.strategies.length > 0 ? ` (strategies: ${result.strategies.join(', ')})` : ''}:\n${result.repaired ?? ''}` }]
      },
    },
    async execute(/** @type {any} */ args, /** @type {any} */ _exec) {
      const parsed = /** @type {{ text: string, schema?: unknown, strategies?: { escapeRepair?: boolean, trailingComma?: boolean, truncationClosure?: boolean, fieldCompletion?: boolean } }} */ (args)
      const text = typeof parsed.text === 'string' ? parsed.text : ''
      const schema = parsed.schema ?? {}
      const schemaViolations = validateSchema(schema)
      if (schemaViolations.length > 0) {
        return { ok: false, diff: [], strategies: [], truncated: false, validated: false, error: { code: 'INVALID_SCHEMA', message: schemaViolations.join('; ') } }
      }
      const strategies = {
        escapeRepair: parsed.strategies?.escapeRepair ?? resolved.repair.strategies.escapeRepair,
        trailingComma: parsed.strategies?.trailingComma ?? resolved.repair.strategies.trailingComma,
        truncationClosure: parsed.strategies?.truncationClosure ?? resolved.repair.strategies.truncationClosure,
        fieldCompletion: parsed.strategies?.fieldCompletion ?? resolved.repair.strategies.fieldCompletion,
      }
      const extracted = extractJsonFromText(text)
      if (!looksLikeJsonText(extracted)) {
        return { ok: false, diff: [], strategies: [], truncated: false, validated: false, error: { code: 'NOT_JSON_TEXT', message: 'text does not carry a JSON object or array' } }
      }
      const outcome = repairJsonText(extracted, schema, { strategies, maxSteps: resolved.repair.maxSteps })
      const diff = sanitizeDiff(outcome.diff, { maxChars: resolved.diffMaxChars, maxEntries: resolved.diffMaxEntries })
      if (!outcome.ok) {
        return {
          ok: false,
          diff: diff.entries,
          strategies: outcome.strategies,
          truncated: diff.truncated || outcome.truncated,
          validated: outcome.validated,
          error: { code: outcome.error?.code ?? 'UNREPAIRABLE', message: outcome.error?.message ?? 'repair failed' },
        }
      }
      return {
        ok: true,
        repaired: outcome.repaired,
        diff: diff.entries,
        strategies: outcome.strategies,
        truncated: diff.truncated || outcome.truncated,
        validated: outcome.validated,
      }
    },
  }))
}

/**
 * Mount the plugin: register the `/translate` command, the `fix_json` tool,
 * and the post-execute repair listener. Every registration is an effect.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the mounting context.
 * @param {object} config - raw loader config.
 */
export function apply(ctx, config) {
  const resolved = resolveConfig(config)
  if (!resolved.enabled) return
  const logger = ctx.logger(name)

  // External rosetta data override: loads and validates at mount so a bad file
  // fails loud before any command can serve a wrong mapping. The bundled table
  // stays the default when no path is configured.
  if (resolved.rosettaDataPath !== undefined) {
    try {
      const snapshot = loadRosettaData(resolved.rosettaDataPath)
      logger.info(`rosetta data overridden from ${resolved.rosettaDataPath} (${snapshot.vendors.length} vendors, ${snapshot.params.length} params)`)
    } catch (error) {
      throw new Error(`dsh-translate: failed to load rosetta data from ${resolved.rosettaDataPath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (resolved.registerCommand) {
    ctx.effect(() => ctx.commands.register({
      name: 'translate',
      description: 'Vendor parameter translation table: /translate [vendors | params | <from> <to> [param]]',
      input: { hint: '[vendors | params | <from> <to> [param]]' },
      handler: invocation => handleTranslateCommand(invocation.rawInput),
    }), 'dsh-translate: /translate command')
  }

  if (resolved.registerTool) {
    ctx.effect(() => ctx.tools.register(/** @type {any} */ (fixJsonTool(resolved))), 'dsh-translate: fix_json tool')
  }

  if (resolved.repair.enabled) {
    ctx.on('tools/post-execute', async (/** @type {any} */ exec, /** @type {any} */ result, next) => {
      // Failures are never flipped into successes; broken JSON that already
      // failed schema validation stays a failure.
      if (result.isError) return next()
      if (typeof result.value !== 'string' || result.value === '') return next()
      const definition = ctx.tools.get(exec.name)
      const schema = definition?.output?.schema
      if (!repairIntended(schema, exec.name, resolved.repair.toolNames)) return next()

      let attempt
      try {
        attempt = attemptRepair(result.value, schema ?? {}, resolved.repair.strategies, resolved.repair.maxSteps)
      } catch (error) {
        logger.warn(`${exec.name}: repair attempt threw: ${error instanceof Error ? error.message : String(error)}`)
        return next()
      }

      if (attempt.claimed && attempt.decision !== undefined) {
        auditFix(exec, {
          tool: exec.name,
          callId: exec.callId,
          ...attempt.audit,
          ...(attempt.audit.outcome === 'repaired' ? { maxFragmentChars: resolved.diffMaxChars } : {}),
        })
        logger.info(`${exec.name}: repaired broken JSON (strategies: ${attempt.audit.strategies.join(', ') || 'none'})`)
        return /** @type {any} */ (attempt.decision)
      }
      if (attempt.audit.outcome === 'unrepairable') {
        auditFix(exec, { tool: exec.name, callId: exec.callId, ...attempt.audit })
        logger.warn(`${exec.name}: broken JSON was unrepairable (${attempt.audit.errorCode ?? 'unknown'}); original value preserved`)
      }
      return next()
    })
  }
}
