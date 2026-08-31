/**
 * Dual-ruler call-id brand: host master renamed the dsh-llm `CallId`
 * brand to `ToolCallId`, while the published 0.1.1-rc.2 line still
 * exports `CallId`. Derive the brand from the dsh-tools execution
 * contract (`ToolExecution['callId']`) so the tests stay green on both
 * rulers without naming either brand name.
 * @module dsh-translate/test/call-id
 */

/** @typedef {import('@deepseek-ai/dsh-tools').ToolExecution['callId']} CallIdValue */

/**
 * Identity factory for the locally derived call-id brand.
 * @param {string} id
 * @returns {CallIdValue}
 */
export const CallId = ((id) => id)
