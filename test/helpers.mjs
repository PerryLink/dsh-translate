// Shared test helpers: load the hand-written client bundle in Node.
import { pathToFileURL } from 'node:url'

let counter = 0

/** Load client/index.js under a fake loader window and return its exports. */
export async function loadClient() {
  let spec
  globalThis.window = {
    __ModuleLoader__: {
      load(value) { spec = value },
    },
    localStorage: {
      getItem() { return null },
      setItem() {},
    },
  }
  counter += 1
  const url = new URL('../client/index.js', import.meta.url)
  url.searchParams.set('t', String(counter) + '-' + String(Date.now()))
  await import(url.href)
  if (spec === undefined) throw new Error('client bundle did not call window.__ModuleLoader__.load')
  return spec.factory()
}

/** A block assembler shaped like @deepseek-ai/dsh-llm BlockAssembler. */
export function fakeAssembler() {
  let text = ''
  return {
    push(chunk) {
      if (chunk !== null && typeof chunk === 'object' && chunk.type === 'text-delta' && typeof chunk.text === 'string') text += chunk.text
    },
    blocks() { return [{ type: 'text', text }] },
  }
}

/** An llm service whose stream answers with one JSON array per call. */
export function fakeLlm(answers) {
  let call = 0
  return {
    calls: [],
    async *stream(request) {
      this.calls.push(request)
      const answer = answers[Math.min(call, answers.length - 1)]
      call += 1
      yield { type: 'text-delta', text: JSON.stringify(answer) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}
