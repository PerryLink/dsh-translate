/**
 * Hand-written type declarations for the dsh-translate JS package.
 * `tsconfig.check.json` (checkJs) validates index.mjs against these shapes;
 * consumers of the published package resolve `types` to this file.
 * @module dsh-translate/types
 */

import type { Context, Plugin } from '@deepseek-ai/cordis'
import type { Schema } from '@deepseek-ai/schemastery'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'

export declare const name: 'dsh-translate'
export declare const inject: readonly ['commands', 'tools']

/** Repair layer strategy switches. */
export interface RepairStrategies {
  escapeRepair: boolean
  trailingComma: boolean
  truncationClosure: boolean
  fieldCompletion: boolean
}

/** Raw repair-layer config. */
export interface RepairConfig {
  enabled?: boolean
  toolNames?: string[]
  strategies?: Partial<RepairStrategies>
  maxSteps?: number
}

/** Raw plugin config — every field optional. */
export interface Config {
  enabled?: boolean
  repair?: RepairConfig
  diffMaxChars?: number
  diffMaxEntries?: number
  registerCommand?: boolean
  registerTool?: boolean
}

export declare const Config: Schema<Config>

/** Fully resolved runtime policy. */
export interface ResolvedConfig {
  readonly enabled: boolean
  readonly repair: {
    readonly enabled: boolean
    readonly toolNames: readonly string[]
    readonly strategies: Readonly<RepairStrategies>
    readonly maxSteps: number
  }
  readonly diffMaxChars: number
  readonly diffMaxEntries: number
  readonly registerCommand: boolean
  readonly registerTool: boolean
}

export declare function resolveConfig(raw?: Config): ResolvedConfig

/** The `translate/fix` session audit event type. */
export declare const FIX_EVENT: 'translate/fix'

/** Sanitized audit payload for one repair attempt (counts and flags only). */
export interface FixAuditEvent {
  tool: string
  callId: string
  outcome: 'repaired' | 'unrepairable' | 'skipped' | 'valid'
  strategies: string[]
  entries: number
  truncated: boolean
  errorCode?: string
  maxFragmentChars?: number
}

export declare function auditFix(exec: ToolRunContext, event: FixAuditEvent): void

export declare function repairIntended(schema: unknown, toolName: string, toolNames: readonly string[]): boolean

export interface RepairAttempt {
  claimed: boolean
  decision?: { kind: 'accept'; value: unknown }
  audit: {
    outcome: 'repaired' | 'unrepairable' | 'skipped' | 'valid'
    strategies: string[]
    entries: number
    truncated: boolean
    errorCode?: string
  }
}

export declare function attemptRepair(
  text: string,
  schema: unknown,
  strategies: RepairStrategies,
  maxSteps: number,
): RepairAttempt

export declare function translateOverview(): string
export declare function translateVendorList(): string
export declare function translateParamList(): string
export declare function translatePair(from: string, to: string, param?: string): { kind: 'success' | 'error'; text: string }
export declare function handleTranslateCommand(rawInput: string): { kind: 'success' | 'error'; text: string }

export declare function fixJsonTool(resolved: ResolvedConfig): ReturnType<typeof import('@deepseek-ai/dsh-tools')['defineTool']>

export declare function apply(ctx: Context, config: Config): void
export declare const plugin: Plugin

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * A broken JSON canonical value in a tool result was considered for
     * deterministic repair — log-only audit carrying counts and flags, never
     * the repaired payload (the model-visible value lives in the tool result).
     */
    'translate/fix': FixAuditEvent
  }
}
