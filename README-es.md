<div align="center">

# 🔁 dsh-translate
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-translate` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness.**

*La misma petición, en cada proveedor. JSON roto, arreglado sin inventar datos.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-translate)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-translate.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-translate/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-translate/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-translate?label=version)](https://github.com/PerryLink/dsh-translate/releases)
[![npm version](https://img.shields.io/npm/v/dsh-translate)](https://www.npmjs.com/package/dsh-translate)
[![npm downloads](https://img.shields.io/npm/dm/dsh-translate)](https://www.npmjs.com/package/dsh-translate)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-translate?metric=downloads&lang=es)](https://dshfind.com/es/plugins/PerryLink/dsh-translate?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## Compatibilidad

| Superficie | Estado |
|---|---|
| Harness | Versión principal **`dsh-v0.1.7-rc.1`** (verificado el 2026-09-24: doble typecheck + `node --test` 80/80 + puertas self-contained/artifacts). Los pines npm dev/test ahora son `0.1.7-rc.1`; peers `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0`. |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Forma | Plugin JS de host puro (sin mitad de navegador) |
| Modelo | Cualquier modelo — la reparación es determinista, sin llamadas extra al modelo |

## Qué obtienes

Dos superficies independientes en un solo bundle:

- **`/translate`** — la tabla de traducción de parámetros entre proveedores: `temperature`, `top_p`, `max_tokens`, `stop`, `system` y 8 parámetros canónicos más, mapeados en **11 proveedores** (OpenAI, ERNIE, Qwen, Anthropic, Google, DeepSeek, Mistral, Cohere, xAI, Groq, Azure). Consulta un mapeo entre dos proveedores, lista proveedores/parámetros, o convierte una petición estándar completa (`transformRequest` en `lib/rosetta.mjs`).
- **La capa de reparación** — un listener de `tools/post-execute` más la herramienta `fix_json`. Cuando un resultado exitoso lleva JSON roto como texto (esquema con raíz string o raíz `json` sin restricciones, o una herramienta optada por nombre), la capa lo repara de forma determinista: extracción de vallas markdown, reparación de escapes, eliminación de comas finales, cierre por truncamiento y completado de campos requeridos con marcadores `null` explícitos. **Nunca se inventa un valor** — un resultado que aún viole el esquema falla cerrado, y los resultados fallidos nunca se convierten en éxitos.

```text
resultado de herramienta (éxito, texto JSON) ──▶ extraer valla ──▶ parsear
    │ ok? ──▶ validar contra esquema ──▶ accept { kind: 'accept', value }  (el registro revalida y re-renderiza)
    │ roto ──▶ escapes / comas / cierre / null ──▶ validar
    │ irreparable ──▶ next()  (valor original intacto) + auditoría translate/fix (solo conteos)
```

## Inicio rápido

```sh
# 1. instala el bundle en tu perfil
dsh plugin --profile web add "github:PerryLink/dsh-translate#main"

# o desde npm (versiones publicadas)
dsh plugin --profile web add dsh-translate

# 2. reinicia y verifica la fila
dsh --profile web --dump-config | grep -A2 'id: dsh-translate'
```

Luego pídele al agente un mapeo o una reparación:

```
> /translate openai ernie max_tokens
> Usa fix_json para reparar: {"a": 1,} contra {"type":"object","properties":{"a":{"type":"integer"}},"required":["a"]}
```

## Instalación y desinstalación

- **Canal git** (último `main`): `dsh plugin --profile web add "github:PerryLink/dsh-translate#main"` — JS puro, sin paso de compilación.
- **Canal npm** (versiones publicadas): `dsh plugin --profile web add dsh-translate`.
- **Canal tarball**: `pnpm pack` en este repositorio y luego `dsh plugin --profile web add ./dsh-translate-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-translate` (o elimina la fila del parche del perfil).

## Configuración

Todos los ajustes son campos `Config` de Schemastery (modificables desde cordis.yml). Una sobrescritura dirigida por id reemplaza toda la fila — vuelve a declarar cada clave que necesites. `cordis.patch.yml` documenta cada clave en línea.

| Clave | Por defecto | Significado |
|---|---|---|
| `enabled` | `true` | Interruptor maestro; `false` no registra nada |
| `repair.enabled` | `true` | Interruptor de la capa de reparación post-execute |
| `repair.toolNames` | `[]` | Nombres extra de herramientas cuyos resultados de texto JSON pueden repararse (además de raíces string / `json`) |
| `repair.strategies.escapeRepair` | `true` | Escapar caracteres de control crudos dentro de strings |
| `repair.strategies.trailingComma` | `true` | Eliminar comas directamente antes de un cierre |
| `repair.strategies.truncationClosure` | `true` | Cerrar un string o contenedor abierto cortado por truncamiento |
| `repair.strategies.fieldCompletion` | `true` | Completar campos requeridos faltantes con marcadores `null` explícitos |
| `repair.maxSteps` | `8` | Presupuesto de aplicación de estrategias (pasadas del bucle, 1..64) |
| `diffMaxChars` | `200` | Tope de un fragmento de diff registrado, en caracteres |
| `diffMaxEntries` | `50` | Tope de entradas de diff registradas |
| `registerCommand` | `true` | Registrar el comando `/translate` |
| `registerTool` | `true` | Registrar la herramienta `fix_json` |
| `rosettaDataPath` | *(none)* | Archivo de datos rosetta externo opcional (misma forma que el `lib/rosetta-data.json` incluido); anula la tabla de mapeo integrada |

Ejemplo de sobrescritura en el parche de tu perfil:

```yaml
- insert:
    - id: dsh-translate
      name: dsh-translate
      config:
        enabled: true
        repair:
          enabled: true
          toolNames: ['emit-json']
          strategies:
            escapeRepair: true
            trailingComma: true
            truncationClosure: true
            fieldCompletion: true
          maxSteps: 8
        diffMaxChars: 200
        diffMaxEntries: 50
        registerCommand: true
        registerTool: true
```

## Herramientas y superficies

| Superficie | Tipo | Notas |
|---|---|---|
| `/translate` | comando | `vendors`, `params`, o mapeo por pares `<from> <to> [param]` |
| `fix_json` | herramienta | `{ text, schema?, strategies? }` → `{ ok, repaired?, diff?, strategies, truncated, validated, error? }`; los fragmentos del diff están acotados y sanitizados |
| reparación post-execute | listener | Automática para resultados de éxito de tipo string con raíces string / `json` (más `repair.toolNames`); siempre llama `next()` salvo que reclame la llamada |

## Permisos y datos

- **Permisos**: sin red, sin subprocesos, sin credenciales — el plugin solo consume los servicios oficiales `commands` y `tools` y escribe en el registro de sesión.
- **Datos**: la reparación nunca inventa valores; las únicas adiciones visibles para el modelo son el valor canónico reparado y el diff de `fix_json`. Los eventos de auditoría (`translate/fix`) llevan nombre de herramienta, call id, estrategias, conteos de ediciones y marcas de truncamiento — nunca payloads. La escritura de auditoría está controlada por el vocabulario de eventos de sesión del host: los hosts que conocen `translate/fix` reciben el append llano de dos argumentos, los hosts con el envoltorio `ignorable` reciben el append marcado, y los hosts sin envoltorio (`0.1.0-rc.6`–`0.1.1-rc.2`, `0.1.2-rc.1`) no reciben auditoría — el resultado de la herramienta sigue siendo el registro visible para el modelo.
0.1.2-rc.1 (adaptado el 2026-09-04): el sobre de sesión conserva su campo ignorable solo para compatibilidad de lectura de logs almacenados - Session.append aún no puede estamparlo, por lo que el comportamiento de la puerta no cambia.

## Límites de seguridad

- **Solo determinista.** La reparación es cirugía de texto acotada; la rama de reintento con LLM del upstream JSON-Schema-Enforcer-Proxy no fue portada a propósito — un listener post-execute nunca llama a un modelo.
- **Fallo cerrado.** La sintaxis irreparable y las violaciones de esquema dejan el resultado original intacto (o devuelven un error estructurado desde `fix_json`); los marcadores `null` solo se aplican cuando el esquema acepta `null`.
- **Entrada hostil acotada.** Las palabras clave de esquema no soportadas y los esquemas circulares se rechazan; la validación `oneOf` está limitada por profundidad (`MAX_ONE_OF_DEPTH`) y por un presupuesto de ramas (`MAX_ONE_OF_BUDGET`), así un esquema exponencial no puede agotar el proceso.
- **Sin fuga de payloads.** Los logs y eventos de auditoría nunca contienen payloads reparados; los diffs se truncan y acotan antes de mostrarse o almacenarse.

## Limitaciones conocidas

- El subconjunto de JSON Schema soportado refleja el registro de herramientas del harness (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const`); otras palabras clave se rechazan como no soportadas, no se ignoran en silencio.
- La reparación solo aplica a resultados exitosos cuyo valor canónico es un string de texto JSON; un valor que ya falló la validación llega como resultado fallido y nunca se invierte.
- La tabla cubre 11 proveedores × 13 parámetros canónicos; las filas `extended` siguen referencias públicas de API (no el trío upstream) y están marcadas como tales en `lib/rosetta.mjs`.
- En hosts que ni conocen `translate/fix` ni exponen el envoltorio `ignorable` en `session.append` — la línea publicada `0.1.0-rc.6`–`0.1.1-rc.2` y `0.1.2-rc.1`, que falla cerrado ante tipos de evento desconocidos al leer — la puerta adaptativa omite el append de auditoría para que el registro de sesión nunca se contamine; el espejo de auditoría se pierde en esos hosts hasta que el tipo de evento se registre.

## Desarrollo

```sh
pnpm install        # node ^22.19 || >=24
pnpm test           # node --test: 70 tests (suites puras + suite de ensamblaje con servicios reales)
pnpm run check      # tsc checkJs contra types.d.ts
pnpm run verify:self-contained  # las especificaciones de dependencias resuelven desde el registry
pnpm run verify:artifacts       # la cara ESM importa bajo Node plano + exports de lib presentes
node scripts/check-readme-sync.mjs  # puerta de sincronización de los cinco READMEs (también en CI)
pnpm pack           # el tarball publicado
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `json-repair`, `schema-validation`, `parameter-mapping`, `llm-api`, `tooling`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creador y mantenedor: portes de la tabla de traducción y del pipeline de reparación, superficies del plugin, tests y documentación en cinco idiomas.

## PerryLink DSH Plugin Family

This project is one of the **45 DeepSeek Harness plugins** maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |


## License

[Apache License 2.0](LICENSE) © 2026 dsh-translate contributors

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
