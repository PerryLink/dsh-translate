<div align="center">

# 🔁 dsh-translate
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-translate` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Tradução de parâmetros entre provedores e reparo determinista de JSON para o DeepSeek Harness.**

*O mesmo pedido, em cada provedor. JSON quebrado, consertado sem inventar dados.*

**É uma tabela de mapeamento de parâmetros entre provedores, não tradução automática.**

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-translate?metric=downloads&lang=pt)](https://dshfind.com/pt/plugins/PerryLink/dsh-translate?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-translate
```


</div>

---


**📖 Base de conhecimento do ecossistema** — dados medidos, não marketing: [guia de desenvolvimento · dados de seleção · critérios de manutenção](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Instalação e desinstalação

- **Canal git** (último `main`): `dsh plugin --profile web add github:PerryLink/dsh-translate` — JS puro, sem etapa de build.
- **Canal npm** (versões publicadas): `dsh plugin --profile web add dsh-translate`.
- **Canal tarball**: `pnpm pack` neste repositório e então `dsh plugin --profile web add ./dsh-translate-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-translate` (ou remova a linha do patch do perfil).

## ⭐ 如果它帮到了你

Este plugin faz parte da [família de plugins DSH](https://github.com/PerryLink) (mais de 40, todos Apache-2.0). Se for útil, **deixe uma estrela**: não desbloqueia nada, mas ajuda a próxima pessoa a encontrá-lo.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-translate?

Tradução de parâmetros entre provedores e reparo determinista de JSON para o DeepSeek Harness.

O mesmo pedido, em cada provedor. JSON quebrado, consertado sem inventar dados.

![Demonstração de terminal do dsh-translate: dsh-translate — /translate openai ernie max_tokens](https://raw.githubusercontent.com/PerryLink/dsh-translate/main/docs/assets/dsh-translate-hero.png)

![Animated terminal demo of dsh-translate](https://raw.githubusercontent.com/PerryLink/dsh-translate/main/docs/assets/dsh-translate-demo.gif)

*A mesma execução, animada.*

## Compatibilidade

| Superfície | Status |
|---|---|
| Harness | Versão principal **`dsh-v0.2.1-alpha.1`** (verificado em 2026-09-25: typecheck duplo + `node --test` 80/80 + portas self-contained/artifacts). Os pins npm dev/test agora são `0.1.7-rc.2`; peers `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0`. |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Forma | Plugin JS de host puro (sem metade de navegador) |
| Modelo | Qualquer modelo — o reparo é determinista, sem chamadas extras ao modelo |

## O que você ganha

Duas superfícies independentes em um só bundle:

- **`/translate`** — a tabela de tradução de parâmetros entre provedores: `temperature`, `top_p`, `max_tokens`, `stop`, `system` e mais 8 parâmetros canônicos, mapeados em **11 provedores** (OpenAI, ERNIE, Qwen, Anthropic, Google, DeepSeek, Mistral, Cohere, xAI, Groq, Azure). Consulte o mapeamento entre dois provedores, liste provedores/parâmetros ou converta um pedido padrão completo (`transformRequest` em `lib/rosetta.mjs`).
- **A camada de reparo** — um listener de `tools/post-execute` mais a ferramenta `fix_json`. Quando um resultado bem-sucedido carrega JSON quebrado como texto (esquema com raiz string ou raiz `json` sem restrições, ou uma ferramenta optada por nome), a camada repara de forma determinista: extração de cercas markdown, reparo de escapes, remoção de vírgulas finais, fechamento por truncamento e preenchimento de campos obrigatórios com marcadores `null` explícitos. **Nenhum valor é inventado** — um resultado que ainda viole o esquema falha fechado, e resultados com falha nunca viram sucessos.

```text
resultado de ferramenta (sucesso, texto JSON) ──▶ extrair cerca ──▶ parsear
    │ ok? ──▶ validar contra o esquema ──▶ accept { kind: 'accept', value }  (o registro revalida e re-renderiza)
    │ quebrado ──▶ escapes / vírgulas / fechamento / null ──▶ validar
    │ irreparável ──▶ next()  (valor original intacto) + auditoria translate/fix (só contagens)
```

## Início rápido

```sh
dsh plugin --profile web add github:PerryLink/dsh-translate
```

```sh
# 1. instale o bundle no seu perfil
dsh plugin --profile web add github:PerryLink/dsh-translate

# ou pelo npm (versões publicadas)
dsh plugin --profile web add dsh-translate

# 2. reinicie e verifique a linha
dsh --profile web --dump-config | grep -A2 'id: dsh-translate'
```

Depois peça ao agente um mapeamento ou um reparo:

```
> /translate openai ernie max_tokens
> Use fix_json para reparar: {"a": 1,} contra {"type":"object","properties":{"a":{"type":"integer"}},"required":["a"]}
```

## Configuração

Todos os ajustes são campos `Config` do Schemastery (alteráveis pelo cordis.yml). Uma sobrescrita direcionada por id substitui a linha inteira — redeclare cada chave que precisar. O `cordis.patch.yml` documenta cada chave em linha.

| Chave | Padrão | Significado |
|---|---|---|
| `enabled` | `true` | Interruptor mestre; `false` não registra nada |
| `repair.enabled` | `true` | Interruptor da camada de reparo post-execute |
| `repair.toolNames` | `[]` | Nomes extras de ferramentas cujos resultados de texto JSON podem ser reparados (além de raízes string / `json`) |
| `repair.strategies.escapeRepair` | `true` | Escapar caracteres de controle crus dentro de strings |
| `repair.strategies.trailingComma` | `true` | Remover vírgulas diretamente antes de um fechamento |
| `repair.strategies.truncationClosure` | `true` | Fechar uma string ou contêiner aberto cortado por truncamento |
| `repair.strategies.fieldCompletion` | `true` | Completar campos obrigatórios faltantes com marcadores `null` explícitos |
| `repair.maxSteps` | `8` | Orçamento de aplicação de estratégias (passadas do laço, 1..64) |
| `diffMaxChars` | `200` | Teto de um fragmento de diff registrado, em caracteres |
| `diffMaxEntries` | `50` | Teto de entradas de diff registradas |
| `registerCommand` | `true` | Registrar o comando `/translate` |
| `registerTool` | `true` | Registrar a ferramenta `fix_json` |
| `rosettaDataPath` | *(none)* | Arquivo de dados rosetta externo opcional (mesma forma do `lib/rosetta-data.json` incluído); substitui a tabela de mapeamento integrada |

Exemplo de sobrescrita no patch do seu perfil:

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

## Ferramentas e superfícies

| Superfície | Tipo | Notas |
|---|---|---|
| `/translate` | comando | `vendors`, `params`, ou mapeamento por pares `<from> <to> [param]` |
| `fix_json` | ferramenta | `{ text, schema?, strategies? }` → `{ ok, repaired?, diff?, strategies, truncated, validated, error? }`; os fragmentos do diff são limitados e sanitizados |
| reparo post-execute | listener | Automático para resultados de sucesso string com raízes string / `json` (mais `repair.toolNames`); sempre chama `next()` salvo quando reclama a chamada |

## Permissões e dados

- **Permissões**: sem rede, sem subprocessos, sem credenciais — o plugin apenas consome os serviços oficiais `commands` e `tools` e grava no registro de sessão.
- **Dados**: o reparo nunca inventa valores; as únicas adições visíveis ao modelo são o valor canônico reparado e o diff do `fix_json`. Os eventos de auditoria (`translate/fix`) carregam nome de ferramenta, call id, estratégias, contagens de edições e marcas de truncamento — nunca payloads. A gravação de auditoria é controlada pelo vocabulário de eventos de sessão do host: hosts que conhecem `translate/fix` recebem o append simples de dois argumentos, hosts com o envelope `ignorable` recebem o append marcado, e hosts sem envelope (`0.1.0-rc.6`–`0.1.1-rc.2`, `0.1.2-rc.1`) não recebem auditoria — o resultado da ferramenta continua sendo o registro visível ao modelo.
0.1.2-rc.1 (adaptado em 2026-09-04): o envelope de sessão mantém seu campo ignorable apenas para compatibilidade de leitura de logs armazenados - o Session.append ainda não consegue estampá-lo, então o comportamento da porta não muda.

## Limites de segurança

- **Apenas determinista.** O reparo é cirurgia de texto limitada; a ramificação de retry com LLM do upstream JSON-Schema-Enforcer-Proxy não foi portada de propósito — um listener post-execute nunca chama um modelo.
- **Falha fechada.** Sintaxe irreparável e violações de esquema deixam o resultado original intacto (ou retornam um erro estruturado do `fix_json`); os marcadores `null` só entram quando o esquema aceita `null`.
- **Entrada hostil limitada.** Palavras-chave de esquema não suportadas e esquemas circulares são rejeitados; a validação `oneOf` é limitada por profundidade (`MAX_ONE_OF_DEPTH`) e por um orçamento de ramos (`MAX_ONE_OF_BUDGET`), de modo que um esquema exponencial não pode esgotar o processo.
- **Sem vazamento de payloads.** Logs e eventos de auditoria nunca contêm payloads reparados; os diffs são truncados e limitados antes de exibição ou armazenamento.

## Limitações conhecidas

- O subconjunto de JSON Schema suportado reflete o registro de ferramentas do harness (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const`); outras palavras-chave são rejeitadas como não suportadas, não ignoradas em silêncio.
- O reparo só se aplica a resultados bem-sucedidos cujo valor canônico é um string de texto JSON; um valor que já falhou a validação chega como resultado com falha e nunca é invertido.
- A tabela cobre 11 provedores × 13 parâmetros canônicos; as linhas `extended` seguem referências públicas de API (não o trio upstream) e estão marcadas como tal em `lib/rosetta.mjs`.
- Em hosts que não conhecem `translate/fix` nem expõem o envelope `ignorable` em `session.append` (a linha publicada `0.1.0-rc.6`–`0.1.1-rc.2` e `0.1.2-rc.1`, que falha fechado para tipos de evento desconhecidos na leitura), a porta adaptativa pula o append de auditoria para que o registro de sessão nunca seja poluído; o espelho de auditoria se perde nesses hosts até que o tipo de evento seja registrado.

## Desenvolvimento

```sh
pnpm install        # node ^22.19 || >=24
pnpm test           # node --test: 57 testes (suítes puras + suíte de montagem com serviços reais)
pnpm run check      # tsc checkJs contra types.d.ts
pnpm run verify:self-contained  # especificações de dependências resolvem pelo registry
pnpm run verify:artifacts       # a face ESM importa sob Node puro + exports da lib presentes
node scripts/check-readme-sync.mjs  # porta de sincronização dos cinco READMEs (também no CI)
pnpm pack           # o tarball publicado
```

## Interoperabilidade com outros plugins do DSH

Verificado contra **DSH `0.2.0-rc.2`** (o runtime para o qual este README é publicado) e o conjunto de plugins com mais estrelas pesquisado em 2026-10-05.

Este plugin **não interfere** em outros plugins, incluindo os de mais estrelas:

- **Sem colisão de nome de ferramenta.** Todas as ferramentas têm namespace; nenhuma ocupa um nome puro já pertencente a uma ferramenta embutida ou a outro plugin.
- **Sem colisão de chave de serviço.** Não fornece nenhuma chave de serviço, portanto não pode colidir em uma.
- **Sem colisão de slot.** Não registra nenhuma chave de slot de cliente, então não disputa um assento `shadows-shipped-ui`.
- **Sem colisão de rota HTTP.** Não registra nenhum prefixo `webServer`.
- **Sem colisão na camada de patch.** O patch do bundle apenas faz `insert` da própria linha; nunca sobrescreve o `config` de uma linha embutida.
- **Sem mutação global.** Não altera protótipos, não reescreve `process.env` nem substitui o dispatcher global de fetch.

**Listeners de eventos compartilhados não interferem por construção.** Observa os eventos sensíveis à ordem `tools/post-execute` com `ctx.on()` — o registro de difusão do Cordis, onde cada listener executa e nenhum pode privar outro do turno. **Todos os listeners aqui delegam via `next()`**, então a cadeia nunca é curto-circuitada:
  - `tools/post-execute` — also used by `cc-safety-net` (1576★).

Evidência estática: `dsh-plugin-doctor` K10–K13 retornam `pass` em todas as verificações deste repositório.

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `json-repair`, `schema-validation`, `parameter-mapping`, `llm-api`, `tooling`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — criador e mantenedor: portes da tabela de tradução e do pipeline de reparo, superfícies do plugin, testes e a documentação em cinco idiomas.

## Família de plugins DSH da PerryLink

Este projeto faz parte da família de plugins do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O registro fica recolhido abaixo para que cada README mantenha uma primeira tela curta; expanda para ver cada linha e seu status.

<details>
<summary>Expandir todos os plugins</summary>

| Plugin | Status |
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
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver o README do repositório |

</details>## License

[Apache License 2.0](LICENSE) © 2026 dsh-translate contributors

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.
