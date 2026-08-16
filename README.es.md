<div align="center">

# 🔁 dsh-translate

**Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness.**

*La misma petición, en cada proveedor. JSON roto, arreglado sin inventar datos.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-translate/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-translate/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-translate?label=version)](https://github.com/PerryLink/dsh-translate/releases)
[![npm version](https://img.shields.io/npm/v/dsh-translate)](https://www.npmjs.com/package/dsh-translate)
[![npm downloads](https://img.shields.io/npm/dm/dsh-translate)](https://www.npmjs.com/package/dsh-translate)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibilidad

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `0.1.0-rc.6` (compatibilidad declarada para `0.1.0-rc.5`–`0.1.0-rc.6`) |
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
- **Datos**: la reparación nunca inventa valores; las únicas adiciones visibles para el modelo son el valor canónico reparado y el diff de `fix_json`. Los eventos de auditoría (`translate/fix`) llevan nombre de herramienta, call id, estrategias, conteos de ediciones y marcas de truncamiento — nunca payloads.

## Límites de seguridad

- **Solo determinista.** La reparación es cirugía de texto acotada; la rama de reintento con LLM del upstream JSON-Schema-Enforcer-Proxy no fue portada a propósito — un listener post-execute nunca llama a un modelo.
- **Fallo cerrado.** La sintaxis irreparable y las violaciones de esquema dejan el resultado original intacto (o devuelven un error estructurado desde `fix_json`); los marcadores `null` solo se aplican cuando el esquema acepta `null`.
- **Entrada hostil acotada.** Las palabras clave de esquema no soportadas y los esquemas circulares se rechazan; la validación `oneOf` está limitada por profundidad (`MAX_ONE_OF_DEPTH`) y por un presupuesto de ramas (`MAX_ONE_OF_BUDGET`), así un esquema exponencial no puede agotar el proceso.
- **Sin fuga de payloads.** Los logs y eventos de auditoría nunca contienen payloads reparados; los diffs se truncan y acotan antes de mostrarse o almacenarse.

## Limitaciones conocidas

- El subconjunto de JSON Schema soportado refleja el registro de herramientas del harness (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const`); otras palabras clave se rechazan como no soportadas, no se ignoran en silencio.
- La reparación solo aplica a resultados exitosos cuyo valor canónico es un string de texto JSON; un valor que ya falló la validación llega como resultado fallido y nunca se invierte.
- La tabla cubre 11 proveedores × 13 parámetros canónicos; las filas `extended` siguen referencias públicas de API (no el trío upstream) y están marcadas como tales en `lib/rosetta.mjs`.

## Desarrollo

```sh
pnpm install        # node ^22.19 || >=24
pnpm test           # node --test: 57 tests (suites puras + suite de ensamblaje con servicios reales)
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

## License

[Apache License 2.0](LICENSE) © 2026 dsh-translate contributors
