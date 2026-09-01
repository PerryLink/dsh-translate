<div align="center">

# 🔁 dsh-translate
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-translate` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Tradução de parâmetros entre provedores e reparo determinista de JSON para o DeepSeek Harness.**

*O mesmo pedido, em cada provedor. JSON quebrado, consertado sem inventar dados.*

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

## Compatibilidade

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `0.1.2-alpha.3` |
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
# 1. instale o bundle no seu perfil
dsh plugin --profile web add "github:PerryLink/dsh-translate#main"

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

## Instalação e desinstalação

- **Canal git** (último `main`): `dsh plugin --profile web add "github:PerryLink/dsh-translate#main"` — JS puro, sem etapa de build.
- **Canal npm** (versões publicadas): `dsh plugin --profile web add dsh-translate`.
- **Canal tarball**: `pnpm pack` neste repositório e então `dsh plugin --profile web add ./dsh-translate-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-translate` (ou remova a linha do patch do perfil).

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
- **Dados**: o reparo nunca inventa valores; as únicas adições visíveis ao modelo são o valor canônico reparado e o diff do `fix_json`. Os eventos de auditoria (`translate/fix`) carregam nome de ferramenta, call id, estratégias, contagens de edições e marcas de truncamento — nunca payloads. A gravação de auditoria é controlada pelo vocabulário de eventos de sessão do host: hosts que conhecem `translate/fix` recebem o append simples de dois argumentos, hosts com o envelope `ignorable` recebem o append marcado, e hosts sem envelope (`0.1.0-rc.6`–`0.1.1-rc.2`, `0.1.2-alpha.3`) não recebem auditoria — o resultado da ferramenta continua sendo o registro visível ao modelo.
0.1.2-alpha.3 (adaptado em 2026-09-01): o envelope de sessão mantém seu campo ignorable apenas para compatibilidade de leitura de logs armazenados - o Session.append ainda não consegue estampá-lo, então o comportamento da porta não muda.

## Limites de segurança

- **Apenas determinista.** O reparo é cirurgia de texto limitada; a ramificação de retry com LLM do upstream JSON-Schema-Enforcer-Proxy não foi portada de propósito — um listener post-execute nunca chama um modelo.
- **Falha fechada.** Sintaxe irreparável e violações de esquema deixam o resultado original intacto (ou retornam um erro estruturado do `fix_json`); os marcadores `null` só entram quando o esquema aceita `null`.
- **Entrada hostil limitada.** Palavras-chave de esquema não suportadas e esquemas circulares são rejeitados; a validação `oneOf` é limitada por profundidade (`MAX_ONE_OF_DEPTH`) e por um orçamento de ramos (`MAX_ONE_OF_BUDGET`), de modo que um esquema exponencial não pode esgotar o processo.
- **Sem vazamento de payloads.** Logs e eventos de auditoria nunca contêm payloads reparados; os diffs são truncados e limitados antes de exibição ou armazenamento.

## Limitações conhecidas

- O subconjunto de JSON Schema suportado reflete o registro de ferramentas do harness (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const`); outras palavras-chave são rejeitadas como não suportadas, não ignoradas em silêncio.
- O reparo só se aplica a resultados bem-sucedidos cujo valor canônico é um string de texto JSON; um valor que já falhou a validação chega como resultado com falha e nunca é invertido.
- A tabela cobre 11 provedores × 13 parâmetros canônicos; as linhas `extended` seguem referências públicas de API (não o trio upstream) e estão marcadas como tal em `lib/rosetta.mjs`.
- Em hosts que não conhecem `translate/fix` nem expõem o envelope `ignorable` em `session.append` (a linha publicada `0.1.0-rc.6`–`0.1.1-rc.2` e `0.1.2-alpha.3`, que falha fechado para tipos de evento desconhecidos na leitura), a porta adaptativa pula o append de auditoria para que o registro de sessão nunca seja poluído; o espelho de auditoria se perde nesses hosts até que o tipo de evento seja registrado.

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

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `json-repair`, `schema-validation`, `parameter-mapping`, `llm-api`, `tooling`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — criador e mantenedor: portes da tabela de tradução e do pipeline de reparo, superfícies do plugin, testes e a documentação em cinco idiomas.

## PerryLink DSH Plugin Family

Este projeto é um dos [33 plugins de DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Auto-revisão de segundo modelo na cadeia de aprovação, com falha fechada por padrão | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Agentes filhos em segundo plano duráveis com barra lateral de UI web, mensagens e interrupção | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Governança de custos para DeepSeek Harness: orçamentos, carbono e latência em um painel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Equivalente ao /rewind do Claude Code: instantâneos, bifurcações de sessão, restauração de uso único | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migre sessões, memória, habilidades e CLAUDE.md do Claude Code para o DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Controle de desktop nativo multiplataforma para DeepSeek Harness — Windows primeiro. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Verificações de qualidade de datasets e verificação de citações (a ponte numérica opcional consumida aqui) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Defesa contra injeção de prompt, jailbreak e vazamento de segredos para DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Guardião de disciplina de engenharia: sabatina de requisitos, portões de teste, revisão adversária | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Roteamento unificado de geração de imagens estáticas para DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Diagnóstico de desempenho só de leitura para DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Relatórios de pesquisa deterministas para fundos mútuos públicos chineses | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | Integração de PR/issues do GitHub para o DSH, cada escrita controlada por aprovação | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Orquestração de pesquisa setorial que sela as suas entregas através do `ctx.researchReport.assemble` deste plugin | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Base de conhecimento documental local para DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Integração de modelos locais (Ollama) para DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | Diagnósticos, formatação, autocompletar, ações de código e renomeação LSP sobre servidores de linguagem | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | Middleware de mascaramento de PII: anonimiza no limite do modelo, restaura na camada de exibição | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Painel de tempo de execução MCP somente leitura: comando /mcp + aba Settings com status, ferramentas e erros | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Memória entre sessões controlada por aprovação: costura ctx.memory + SQLite + ferramenta de memória | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | Exportador de observabilidade OpenTelemetry e Langfuse para DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Troca de estilo em tempo de execução equivalente ao outputStyles do Claude Code | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Regras de permissão declarativas allow/deny/ask estilo Claude Code com auditoria | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Base de conhecimento de desenvolvimento de plugins como habilidade de agente sob demanda | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Motor de relatórios de pesquisa verificáveis com evidência endereçada por conteúdo | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Pontuação de qualidade multidimensional para plugins de DeepSeek Harness. | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Fixe sessões na barra lateral web com ordenação durável | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Sincronização de sessões entre dispositivos para DeepSeek Harness — um espelho git dedicado do seu armazenamento de sessões. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Pacote de habilidades de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Loop de sessão com voz para DeepSeek Harness: fale e ouça a resposta. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Test drives isolados de instalação e smoke para plugins de DeepSeek Harness. | |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-translate contributors
