# Third-party notices

`dsh-translate` ports two upstream projects by PerryLink, both Apache-2.0:

| Upstream | Version source | License | Ported into |
|---|---|---|---|
| [GPT-Rosetta-Stone](https://github.com/PerryLink/GPT-Rosetta-Stone) | `upstream/GPT-Rosetta-Stone` (read-only reference) | Apache-2.0 | `lib/rosetta.mjs` — the vendor/parameter translation table (`adapters/*.py`, `mappings/*.py`, `models.py`); upstream test cases converted to `test/rosetta.test.mjs` |
| [JSON-Schema-Enforcer-Proxy](https://github.com/PerryLink/JSON-Schema-Enforcer-Proxy) | `upstream/JSON-Schema-Enforcer-Proxy` (read-only reference) | Apache-2.0 | `lib/fix.mjs` — fence extraction and validation/repair logic (`utils.py`, `core.py`); upstream test cases converted to `test/fix.test.mjs` |

The upstream LLM-retry arm of the enforcer proxy is intentionally not ported: a
`tools/post-execute` listener must stay deterministic and never call a model,
so the retry budget became a bounded pipeline of deterministic text
strategies (documented in `lib/fix.mjs` and `AGENTS.md`).

The `upstream/` directory is gitignored and excluded from the published
package; it exists only as the read-only porting reference.

At runtime the plugin depends only on the official harness packages declared
as peerDependencies (`@deepseek-ai/cordis`, `@deepseek-ai/schemastery`,
`@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-commands`);
it performs no network requests and bundles no third-party code.
