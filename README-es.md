<div align="center">

# 🔁 dsh-translate
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-translate` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness.**

*La misma petición, en cada proveedor. JSON roto, arreglado sin inventar datos.*

**Es una tabla de mapeo de parámetros entre proveedores, no traducción automática.**

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

```sh
dsh plugin --profile <name> add dsh-translate
```


</div>

---


**📖 Base de conocimiento del ecosistema** — datos medidos, no marketing: [guía de desarrollo · datos de selección · criterios de mantenimiento](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Instalación y desinstalación

- **Canal git** (último `main`): `dsh plugin --profile web add github:PerryLink/dsh-translate` — JS puro, sin paso de compilación.
- **Canal npm** (versiones publicadas): `dsh plugin --profile web add dsh-translate`.
- **Canal tarball**: `pnpm pack` en este repositorio y luego `dsh plugin --profile web add ./dsh-translate-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-translate` (o elimina la fila del parche del perfil).

## ⭐ 如果它帮到了你

Este plugin forma parte de la [familia de plugins DSH](https://github.com/PerryLink) (más de 40, todos Apache-2.0). Si te resulta útil, **dale una estrella**: no desbloquea nada, pero ayuda a que la siguiente persona lo encuentre antes.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-translate?

Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness.

La misma petición, en cada proveedor. JSON roto, arreglado sin inventar datos.

![Demostración de terminal de dsh-translate: dsh-translate — /translate openai ernie max_tokens](https://raw.githubusercontent.com/PerryLink/dsh-translate/main/docs/assets/dsh-translate-hero.png)

![Animated terminal demo of dsh-translate](https://raw.githubusercontent.com/PerryLink/dsh-translate/main/docs/assets/dsh-translate-demo.gif)

*La misma ejecución, animada.*

## Compatibilidad

| Superficie | Estado |
|---|---|
| Harness | Versión principal **`dsh-v0.2.1-alpha.1`** (verificado el 2026-09-25: doble typecheck + `node --test` 80/80 + puertas self-contained/artifacts). Los pines npm dev/test ahora son `0.1.7-rc.2`; peers `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0`. |
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
dsh plugin --profile web add github:PerryLink/dsh-translate
```

```sh
# 1. instala el bundle en tu perfil
dsh plugin --profile web add github:PerryLink/dsh-translate

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

## Interoperabilidad con otros plugins de DSH

Verificado contra **DSH `0.2.0-rc.2`** (el runtime para el que se publica este README) y el conjunto de plugins con más estrellas sondeado el 2026-10-05.

Este plugin **no interfiere** con otros plugins, incluidos los de más estrellas:

- **Sin colisión de nombres de herramienta.** Todas las herramientas llevan espacio de nombres; ninguna ocupa un nombre desnudo ya perteneciente a una herramienta incluida u otro plugin.
- **Sin colisión de clave de servicio.** No provee ninguna clave de servicio, así que no puede colisionar en una.
- **Sin colisión de slot.** No registra ninguna clave de slot de cliente, así que no disputa un asiento `shadows-shipped-ui`.
- **Sin colisión de ruta HTTP.** No registra ningún prefijo `webServer`.
- **Sin colisión en la capa de patch.** El patch del bundle solo hace `insert` de su propia fila; nunca sobrescribe el `config` de una fila incluida.
- **Sin mutación global.** No parchea prototipos, ni reescribe `process.env`, ni reemplaza el dispatcher global de fetch.

**Los listeners de eventos compartidos no interfieren por construcción.** Observa los eventos sensibles al orden `tools/post-execute` con `ctx.on()` — el registro de difusión de Cordis, donde cada listener se ejecuta y ninguno puede dejar sin turno a otro. **Todos los listeners aquí delegan por `next()`**, así que la cadena nunca se cortocircuita:
  - `tools/post-execute` — also used by `cc-safety-net` (1576★).

Evidencia estática: `dsh-plugin-doctor` K10–K13 dan `pass` en todas las comprobaciones de este repositorio.

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `json-repair`, `schema-validation`, `parameter-mapping`, `llm-api`, `tooling`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creador y mantenedor: portes de la tabla de traducción y del pipeline de reparación, superficies del plugin, tests y documentación en cinco idiomas.

## PerryLink DSH Plugin Family

Este proyecto forma parte de la familia de plugins de DeepSeek Harness de [PerryLink](https://github.com/PerryLink). El registro permanece plegado abajo para que cada README conserve una primera pantalla corta; expándelo para ver cada fila y su estado.

<details>
<summary>Expandir todos los plugins</summary>

| Plugin | Estado |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver el README del repositorio |

</details>

## License

[Apache License 2.0](LICENSE) © 2026 dsh-translate contributors

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
