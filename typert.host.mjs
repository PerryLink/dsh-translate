// typert.host.mjs — hand-written Typert HOST manifest (exported as `./typert`;
// the typert loader registers the invocations when this package mounts).
//
// Namespace: translatePage. Methods: status (no parameters) and translate
// (one masked-segment request). Both are read-only; neither writes a session
// event, a workspace file or the network beyond the caller's model route.

import { INVOCATIONS } from './lib/wire.mjs'

/** Host Typert manifest (validated by @deepseek-ai/dsh-typert-loader). */
export const TYPERT = Object.freeze({
  package: 'dsh-translate',
  face: 'host',
  schemas: Object.freeze([]),
  invocations: INVOCATIONS,
  model: Object.freeze({
    services: Object.freeze([]),
    events: Object.freeze([]),
    objects: Object.freeze([]),
  }),
})
