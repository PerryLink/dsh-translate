# dsh-translate

**Traduce toda la interfaz a tu idioma — con la ruta de modelo de tu propio DSH, y sin tocar código, rutas, comandos ni nombres de producto.**

Un traductor de extremo a extremo para DeepSeek Harness. La mitad del navegador recorre la página visible, enmascara cada fragmento que debe permanecer literal (bloques de código y código en línea, rutas de archivo, comandos de shell, URL, identificadores, versiones, hashes, números, nombres de producto) en marcadores `⟦n⟧`, y envía la prosa restante a la mitad del host. El host traduce con **la ruta de modelo que tu sesión actual ya usa**, el navegador restaura los marcadores y escribe el resultado de vuelta en los mismos nodos de texto. Los originales permanecen en memoria; un clic en **Original** restaura la página.

Solo de visualización por diseño: el registro de la sesión, el espacio de trabajo y la configuración de DSH nunca se escriben. La transcripción conserva exactamente lo que dijo el modelo.

> **Desde la 0.3.0, `dsh-translate` es el traductor de página completa.** El antiguo plugin de "mapeo de parámetros de proveedor + reparación determinista de JSON" ahora es
> [`dsh-param-repair`](https://github.com/PerryLink/dsh-param-repair) (1.0.0). Si actualizaste desde
> 0.2.x y necesitas ese comportamiento, instala `dsh-param-repair` y elimina esta fila; las claves
> de configuración antiguas (`repair.*`, `rosettaDataPath`) son ignoradas por el nuevo plugin y no hacen fallar el perfil.

[English](README.en.md) · [简体中文](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

## Qué se traduce

| Traducido | Se mantiene literal |
|---|---|
| Prosa del asistente, resúmenes de razonamiento, prosa de la salida de herramientas | Código delimitado y en línea (`code` / `pre`) |
| Encabezados de Markdown, listas, tablas, etiquetas de enlace | Rutas de archivo, globs, comandos y flags, URL, correos electrónicos |
| Botones, etiquetas, textos de configuración | Claves JSON, variables de entorno, identificadores `dsh-*` / `snake_case` / `camelCase` |
| Texto visible de otros plugins | Versiones, hashes, números simples y los marcadores `⟦n⟧` |
| — | Términos de producto: DeepSeek Harness, Cordis, npm, GitHub, Gitee, GitCode, Phocinae, PerryLink, … |

Un nodo de texto sin prosa restante (por ejemplo, una ruta o un fragmento de código) se omite. Si el modelo pierde, renumera o inventa un marcador, ese segmento conserva su texto original en lugar de escribir una cadena a medio enmascarar en la página.

## Instalación

```sh
dsh plugin --profile <name> add dsh-translate
```

Recarga la GUI Web: aparece una píldora **Translate** en la esquina inferior derecha. Haz clic una vez para traducir la página (se convierte en **Original**); haz clic de nuevo para restaurar.

## Requisitos

La traducción usa **tu propio modelo**, sin clave incluida y sin proveedor incluido:

1. El perfil necesita un servicio `llm` y un proveedor que funcione (un chat normal ya lo demuestra);
2. La ruta toma por defecto el `request/header` más reciente registrado por una sesión activa, así que envía primero un mensaje — o fija `provider` / `model` en la configuración.

Sin una ruta, el control muestra el motivo (por ejemplo, `no model route: …`) y la página queda intacta.

## Configuración

Cada clave es un campo de Schemastery; un valor inválido hace fallar la carga del perfil de forma ruidosa.

| Clave | Valor predeterminado | Significado |
|---|---|---|
| `enabled` | `true` | Interruptor principal; `false` no monta nada |
| `targetLang` | `''` | Idioma de destino; vacío sigue la configuración regional de la GUI Web (el idioma del navegador cuando la interfaz está en inglés) |
| `provider` / `model` | `''` | Ruta explícita opcional; **ambos o ninguno**; vacío hereda la ruta de sesión más reciente |
| `maxSegments` | `40` | Segmentos por llamada al modelo (1–200) |
| `maxChars` | `6000` | Caracteres por llamada al modelo (200–40000) |
| `timeoutMs` | `60000` | Plazo por llamada (1000–600000) |
| `glossary` | `[]` | Términos adicionales que se mantienen literales |

Ejemplo: forzar japonés y proteger nombres de producto internos:

```yaml
- id: dsh-translate
  name: dsh-translate
  config:
    enabled: true
    targetLang: ja
    glossary: [Acme Ledger, Internal Ticketing]
```

## Coste y privacidad

- **Bajo demanda, solo texto visible**: nada se ejecuta en segundo plano hasta que se hace clic en el control; desactivarlo detiene el trabajo.
- **Caché**: el mismo segmento de origen (mismo idioma de destino) se traduce una vez y se almacena en caché en el `localStorage` del navegador (máximo 600 entradas); borrar los datos del sitio la vacía.
- **Qué sale de la máquina**: solo la prosa con los fragmentos protegidos enmascarados, enviada al proveedor que configuraste; las rutas, el código, los comandos y los identificadores con forma de clave no se envían como texto traducible.
- **Sin persistencia**: las traducciones viven en el DOM y en la caché del navegador; el registro de la sesión, el espacio de trabajo y la configuración de DSH quedan intactos.
- **Sin credenciales**: el plugin nunca lee ni almacena una clave de API; la autenticación sigue en la configuración del proveedor del host.

## Limitaciones conocidas

- La traducción ocurre en la capa de renderizado. Cuando React vuelve a renderizar un nodo, escribe el original de vuelta; el MutationObserver vuelve a aplicar la traducción en caché sin otra llamada al modelo. Es posible un breve parpadeo.
- El texto en streaming sigue cambiando, así que el plugin traduce tras un periodo de calma de 350 ms; las respuestas largas en streaming reciben su traducción un poco más tarde.
- No hay OCR para imágenes, Canvas ni vistas previas de PDF.
- Los elementos ocultos (popovers con `display:none`) no se recorren; el observer los recoge cuando se vuelven visibles.
- La propia GUI ya incluye ocho idiomas (en / zh / ja / es / fr / de / ru / pt); este plugin traduce el **contenido** y el texto en inglés de plugins de terceros, y no reemplaza el sistema de idiomas integrado.

## Desarrollo

```sh
pnpm install
pnpm test        # 21 cases: masking/restore, placeholder checks, batching, route resolution, jsdom DOM behaviour, descriptor parity
pnpm run lint
```

Estructura:

- `index.mjs` — entrada del host (Config + montaje del servicio)
- `lib/service.mjs` — el servicio Typert `translatePage` (status / translate)
- `lib/engine.mjs` — prompt, batching, análisis, verificación de marcadores (sin cordis, sin DOM; probado con tests unitarios)
- `lib/wire.mjs` — los descriptores de invocación compartidos por ambas caras
- `typert.host.mjs` — manifiesto Typert del host
- `client/index.js` — bundle de cliente escrito a mano: recorrido del DOM, enmascarado, caché, control flotante

## Licencia

Apache-2.0. Un plugin de la comunidad; no está afiliado con DeepSeek.
