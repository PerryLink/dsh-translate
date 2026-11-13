# dsh-translate

**Traduza a interface inteira para o seu idioma — com a sua própria rota de modelo DSH, e sem tocar em código, caminhos, comandos ou nomes de produtos.**

Um tradutor ponta a ponta para o DeepSeek Harness. A metade do navegador percorre a página visível, mascara todo trecho que deve permanecer literal (blocos de código e código inline, caminhos de arquivo, comandos de shell, URLs, identificadores, versões, hashes, números, nomes de produtos) em placeholders `⟦n⟧`, e envia a prosa restante para a metade do host. O host traduz com **a rota de modelo que a sua sessão atual já usa**, o navegador restaura os placeholders e grava o resultado de volta nos mesmos nós de texto. Os originais permanecem na memória; um clique em **Original** restaura a página.

Apenas exibição por design: o log da sessão, o espaço de trabalho e a configuração do DSH nunca são gravados. O transcript mantém exatamente o que o modelo disse.

> **Desde a 0.3.0, o `dsh-translate` é o tradutor de página inteira.** O antigo plugin de "mapeamento
> de parâmetros de fornecedor + reparo determinístico de JSON" agora é
> [`dsh-param-repair`](https://github.com/PerryLink/dsh-param-repair) (1.0.0). Se você atualizou a partir da
> 0.2.x e precisa desse comportamento, instale o `dsh-param-repair` e remova esta linha; as chaves de configuração
> antigas (`repair.*`, `rosettaDataPath`) são ignoradas pelo novo plugin e não fazem o perfil falhar.

[English](README.en.md) · [简体中文](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

## O que é traduzido

| Traduzido | Mantido literal |
|---|---|
| Prosa do assistente, resumos de raciocínio, prosa da saída de ferramentas | Código em bloco e inline (`code` / `pre`) |
| Cabeçalhos Markdown, listas, tabelas, rótulos de links | Caminhos de arquivo, globs, comandos e flags, URLs, e-mails |
| Botões, rótulos, textos de configuração | Chaves JSON, variáveis de ambiente, identificadores `dsh-*` / `snake_case` / `camelCase` |
| Textos visíveis de outros plugins | Versões, hashes, números simples e os placeholders `⟦n⟧` |
| — | Termos de produto: DeepSeek Harness, Cordis, npm, GitHub, Gitee, GitCode, Phocinae, PerryLink, … |

Um nó de texto sem prosa restante (por exemplo, um caminho ou um trecho de código) é ignorado. Se o modelo perder, renumerar ou inventar um placeholder, esse segmento mantém o texto original em vez de gravar na página uma string parcialmente mascarada.

## Instalação

```sh
dsh plugin --profile <name> add dsh-translate
```

Recarregue a Web GUI: uma pílula **Translate** aparece no canto inferior direito. Clique uma vez para traduzir a página (ela passa a ser **Original**); clique de novo para restaurar.

## Requisitos

A tradução usa **o seu próprio modelo**, sem chave embutida e sem provedor embutido:

1. O perfil precisa de um serviço `llm` e de um provedor funcionando (um chat normal já comprova isso);
2. A rota usa por padrão o `request/header` mais recente registrado por uma sessão ativa, então envie uma mensagem primeiro — ou fixe `provider` / `model` na configuração.

Sem uma rota, o controle mostra o motivo (por exemplo, `no model route: …`) e a página fica intacta.

## Configuração

Cada chave é um campo Schemastery; um valor inválido faz o carregamento do perfil falhar de forma explícita.

| Chave | Padrão | Significado |
|---|---|---|
| `enabled` | `true` | Interruptor principal; `false` não monta nada |
| `targetLang` | `''` | Idioma de destino; vazio segue o locale da Web GUI (idioma do navegador quando a UI está em inglês) |
| `provider` / `model` | `''` | Rota explícita opcional; **ambos ou nenhum**; vazio herda a rota da sessão mais recente |
| `maxSegments` | `40` | Segmentos por chamada ao modelo (1–200) |
| `maxChars` | `6000` | Caracteres por chamada ao modelo (200–40000) |
| `timeoutMs` | `60000` | Prazo por chamada (1000–600000) |
| `reasoningEffort` | `off` | Esforço de raciocínio por chamada: `off`, `low`, `high`, `max`; `off` desativa o raciocínio e o lote de tradução não paga a cadeia de pensamento |
| `glossary` | `[]` | Termos extras a manter literais |

Exemplo: forçar japonês e proteger nomes internos de produtos:

```yaml
- id: dsh-translate
  name: dsh-translate
  config:
    enabled: true
    targetLang: ja
    glossary: [Acme Ledger, Internal Ticketing]
```

## Custo e privacidade

- **Sob demanda, apenas o texto da página (popovers ocultos são traduzidos antes de abrir)**: nada roda em segundo plano até o controle ser clicado; desligá-lo interrompe o trabalho.
- **Cache**: o mesmo segmento de origem (mesmo idioma de destino) é traduzido uma vez e armazenado em cache no `localStorage` do navegador (no máximo 600 entradas); limpar os dados do site o apaga.
- **O que sai da máquina**: apenas prosa com os trechos protegidos mascarados, enviada ao provedor que você configurou; caminhos, código, comandos e identificadores com formato de chave não são enviados como texto traduzível.
- **Sem persistência**: as traduções vivem no DOM e no cache do navegador; o log da sessão, o espaço de trabalho e a configuração do DSH permanecem intactos.
- **Sem credenciais**: o plugin nunca lê nem armazena uma chave de API; a autenticação continua com a configuração do provedor do host.

## Limitações conhecidas

- A tradução acontece na camada de renderização. Quando o React re-renderiza um nó, ele grava o original de volta; o MutationObserver reaplica a tradução em cache sem outra chamada ao modelo. Uma breve oscilação visual é possível.
- O texto em streaming continua mudando, então o plugin traduz após 350 ms de silêncio; respostas longas em streaming recebem a tradução um pouco mais tarde.
- Sem OCR para imagens, Canvas ou visualizações de PDF.
- Elementos ocultos (popovers com `display:none`) também são percorridos, então um popover abre já traduzido sem outra chamada ao modelo.
- A própria GUI já traz oito locales (en / zh / ja / es / fr / de / ru / pt); este plugin traduz o **conteúdo** e os textos em inglês de plugins de terceiros, e não substitui o sistema de locales embutido.

## Desenvolvimento

```sh
pnpm install
pnpm test        # 21 cases: masking/restore, placeholder checks, batching, route resolution, jsdom DOM behaviour, descriptor parity
pnpm run lint
```

Estrutura:

- `index.mjs` — entrada do host (Config + montagem do serviço)
- `lib/service.mjs` — o serviço Typert `translatePage` (status / translate)
- `lib/engine.mjs` — prompt, agrupamento em lotes, parsing, verificação de placeholders (sem cordis, sem DOM; testado em unidade)
- `lib/wire.mjs` — os descritores de invocação compartilhados pelas duas faces
- `typert.host.mjs` — manifesto Typert do host
- `client/index.js` — bundle de cliente escrito à mão: percurso do DOM, mascaramento, cache, controle flutuante

## Licença

Apache-2.0. Um plugin da comunidade; sem afiliação com a DeepSeek.
