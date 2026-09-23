<div align="center">

# 🔁 dsh-translate
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-translate` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और निर्धारक JSON मरम्मत।**

*एक ही अनुरोध, हर वेंडर पर। टूटा JSON, बिना डेटा गढ़े ठीक।*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-translate?metric=downloads&lang=hi)](https://dshfind.com/hi/plugins/PerryLink/dsh-translate?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## संगतता

| सतह | स्थिति |
|---|---|
| Harness | मुख्य संस्करण **`dsh-v0.1.7-alpha.1`** (2026-09-18 को सत्यापित: दोहरा typecheck + `node --test` 80/80 + self-contained/artifacts गेट)। npm dev/test पिन अब `0.1.7-alpha.2` हैं; peers `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0`। |
| Node | `^22.19.0 \|\| >=24.0.0` |
| रूप | शुद्ध-host JS प्लगइन (कोई ब्राउज़र हिस्सा नहीं) |
| मॉडल | कोई भी मॉडल — मरम्मत निर्धारक है, कोई अतिरिक्त मॉडल कॉल नहीं |

## आपको क्या मिलता है

एक बंडल में दो स्वतंत्र सतहें:

- **`/translate`** — वेंडर पैरामीटर अनुवाद तालिका: `temperature`, `top_p`, `max_tokens`, `stop`, `system` और 8 अन्य कैननिकल पैरामीटर, **11 वेंडरों** पर मैप किए गए (OpenAI, ERNIE, Qwen, Anthropic, Google, DeepSeek, Mistral, Cohere, xAI, Groq, Azure)। दो वेंडरों के बीच मैपिंग पूछें, वेंडर/पैरामीटर सूची देखें, या `lib/rosetta.mjs` के `transformRequest` से पूरा मानक अनुरोध बदलें।
- **मरम्मत परत** — `tools/post-execute` श्रोता + `fix_json` उपकरण। जब कोई सफल टूल परिणाम टेक्स्ट के रूप में टूटा JSON ले जाता है (string-रूट या अप्रतिबंधित `json`-रूट स्कीमा, या नाम से ऑप्ट-इन किया गया टूल), तो परत उसे निर्धारक रूप से ठीक करती है: markdown फ़ेंस निकालना, एस्केप मरम्मत, अंतिम कॉमा हटाना, ट्रंकेशन बंद करना, और अनिवार्य फ़ील्ड को स्पष्ट `null` प्लेसहोल्डर से भरना। **कोई मान कभी गढ़ा नहीं जाता** — स्कीमा का उल्लंघन करने वाला परिणाम fail-closed होता है, और विफल परिणाम कभी सफलता में नहीं बदले जाते।

```text
टूल परिणाम (सफल, JSON टेक्स्ट) ──▶ फ़ेंस निकालें ──▶ पार्स करें
    │ ठीक? ──▶ स्कीमा-सत्यापन ──▶ accept { kind: 'accept', value }  (रजिस्ट्री पुनः सत्यापित + पुनः रेंडर करती है)
    │ टूटा ──▶ एस्केप / कॉमा / बंद / null ──▶ सत्यापन
    │ अमरम्मत योग्य ──▶ next()  (मूल मान सुरक्षित) + translate/fix ऑडिट (केवल गिनती)
```

## त्वरित शुरुआत

```sh
# 1. बंडल को अपने प्रोफ़ाइल में इंस्टॉल करें
dsh plugin --profile web add "github:PerryLink/dsh-translate#main"

# या npm से (प्रकाशित रिलीज़)
dsh plugin --profile web add dsh-translate

# 2. पुनः आरंभ करें और पंक्ति सत्यापित करें
dsh --profile web --dump-config | grep -A2 'id: dsh-translate'
```

फिर एजेंट से मैपिंग या मरम्मत करवाएँ:

```
> /translate openai ernie max_tokens
> fix_json से मरम्मत करें: {"a": 1,} स्कीमा {"type":"object","properties":{"a":{"type":"integer"}},"required":["a"]} के विरुद्ध
```

## इंस्टॉल और अनइंस्टॉल

- **git चैनल** (नवीनतम `main`): `dsh plugin --profile web add "github:PerryLink/dsh-translate#main"` — शुद्ध JS, कोई बिल्ड चरण नहीं।
- **npm चैनल** (प्रकाशित रिलीज़): `dsh plugin --profile web add dsh-translate`।
- **tarball चैनल**: इस रेपो में `pnpm pack`, फिर `dsh plugin --profile web add ./dsh-translate-<version>.tgz`।
- **अनइंस्टॉल**: `dsh plugin --profile web remove dsh-translate` (या प्रोफ़ाइल पैच से पंक्ति हटाएँ)।

## कॉन्फ़िगरेशन

सभी समायोजन Schemastery `Config` फ़ील्ड हैं (cordis.yml से बदले जा सकते हैं)। id-लक्षित ओवरराइड पूरी पंक्ति बदल देता है — ज़रूरत की हर कुंजी फिर से लिखें। `cordis.patch.yml` हर कुंजी को इनलाइन समझाता है।

| कुंजी | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `enabled` | `true` | मास्टर स्विच; `false` कुछ भी पंजीकृत नहीं करता |
| `repair.enabled` | `true` | post-execute मरम्मत परत का स्विच |
| `repair.toolNames` | `[]` | अतिरिक्त टूल नाम जिनके JSON-टेक्स्ट परिणाम मरम्मत योग्य हैं (string/`json` रूट के अतिरिक्त) |
| `repair.strategies.escapeRepair` | `true` | स्ट्रिंग के अंदर कच्चे नियंत्रण वर्णों को एस्केप करें |
| `repair.strategies.trailingComma` | `true` | बंद करने वाले कोष्ठक से ठीक पहले के कॉमा हटाएँ |
| `repair.strategies.truncationClosure` | `true` | ट्रंकेशन से कटी खुली स्ट्रिंग/कंटेनर को बंद करें |
| `repair.strategies.fieldCompletion` | `true` | अनुपस्थित अनिवार्य फ़ील्ड को स्पष्ट `null` प्लेसहोल्डर से भरें |
| `repair.maxSteps` | `8` | रणनीति अनुप्रयोग बजट (मरम्मत-लूप पास, 1..64) |
| `diffMaxChars` | `200` | लॉग किए गए एक diff खंड की वर्ण सीमा |
| `diffMaxEntries` | `50` | लॉग की गई diff प्रविष्टियों की सीमा |
| `registerCommand` | `true` | `/translate` कमांड पंजीकृत करें |
| `registerTool` | `true` | `fix_json` टूल पंजीकृत करें |
| `rosettaDataPath` | *(none)* | वैकल्पिक बाहरी rosetta डेटा फ़ाइल (बंडल किए गए `lib/rosetta-data.json` जैसा आकार); अंतर्निहित मैपिंग तालिका को ओवरराइड करती है |

आपके प्रोफ़ाइल पैच में ओवरराइड उदाहरण:

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

## टूल और सतहें

| सतह | प्रकार | टिप्पणियाँ |
|---|---|---|
| `/translate` | कमांड | `vendors`, `params`, या `<from> <to> [param]` जोड़ीवार मैपिंग |
| `fix_json` | टूल | `{ text, schema?, strategies? }` → `{ ok, repaired?, diff?, strategies, truncated, validated, error? }`; diff खंड सीमित और सैनिटाइज़्ड |
| post-execute मरम्मत | श्रोता | string/`json` रूट (और `repair.toolNames`) वाले सफल स्ट्रिंग परिणामों पर स्वचालित; जब तक कॉल न ले, हमेशा `next()` |

## अनुमतियाँ और डेटा

- **अनुमतियाँ**: कोई नेटवर्क, कोई सबप्रोसेस, कोई क्रेडेंशियल नहीं — प्लगइन केवल आधिकारिक `commands` व `tools` सेवाएँ उपयोग करता है और सत्र लॉग लिखता है।
- **डेटा**: मरम्मत कभी मान नहीं गढ़ती; मॉडल-दृश्य जोड़ केवल मरम्मत किया गया कैननिकल मान और `fix_json` का diff हैं। सत्र ऑडिट इवेंट (`translate/fix`) में केवल टूल नाम, call id, रणनीति नाम, संपादन गिनती और ट्रंकेशन ध्वज होते हैं — कभी payload नहीं। ऑडिट लेखन होस्ट की सत्र-इवेंट शब्दावली से नियंत्रित होता है: जो होस्ट `translate/fix` जानते हैं उन्हें सादा दो-तर्क append मिलता है, `ignorable` envelope वाले होस्ट को चिह्नित append मिलता है, और बिना envelope वाले होस्ट (`0.1.0-rc.6`–`0.1.1-rc.2`, `0.1.2-rc.1`) को कोई ऑडिट नहीं मिलता — टूल परिणाम ही मॉडल-दृश्य लॉग रहता है।
0.1.2-rc.1 (2026-09-04 को अनुकूलित): सत्र लिफ़ाफ़ा अपना ignorable फ़ील्ड केवल संग्रहीत-लॉग पठन संगतता के लिए रखता है - Session.append अभी भी इसे स्टैम्प नहीं कर सकता, इसलिए गेट व्यवहार अपरिवर्तित है।

## सुरक्षा सीमाएँ

- **केवल निर्धारक।** मरम्मत सीमित टेक्स्ट सर्जरी है; upstream JSON-Schema-Enforcer-Proxy की LLM-पुनर्प्रयास शाखा जानबूझकर पोर्ट नहीं की गई — post-execute श्रोता कभी मॉडल नहीं बुलाता।
- **Fail closed।** अमरम्मत योग्य सिंटैक्स और स्कीमा उल्लंघन मूल परिणाम को यथावत छोड़ते हैं (या `fix_json` से संरचित त्रुटि लौटाते हैं); `null` प्लेसहोल्डर तभी लगते हैं जब स्कीमा `null` स्वीकारे।
- **शत्रु इनपुट सीमित।** असमर्थित स्कीमा कीवर्ड और वृत्ताकार स्कीमा अस्वीकार होते हैं; `oneOf` सत्यापन गहराई (`MAX_ONE_OF_DEPTH`) और शाखा बजट (`MAX_ONE_OF_BUDGET`) से सीमित है, इसलिए घातीय स्कीमा प्रक्रिया को नहीं थका सकती।
- **Payload रिसाव शून्य।** लॉग और ऑडिट इवेंट में कभी मरम्मत किया गया payload नहीं होता; diff दिखाने या रखने से पहले काटे और सीमित किए जाते हैं।

## ज्ञात सीमाएँ

- समर्थित JSON Schema उपसमुच्चय हार्नेस टूल रजिस्ट्री जैसा है (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const`); अन्य कीवर्ड असमर्थित कहकर अस्वीकार होते हैं, चुपचाप नज़रअंदाज़ नहीं।
- मरम्मत केवल उन सफल परिणामों पर लागू होती है जिनका कैननिकल मान JSON-टेक्स्ट स्ट्रिंग है; स्कीमा सत्यापन में पहले ही विफल मान विफल परिणाम के रूप में आता है और कभी पलटा नहीं जाता।
- तालिका 11 वेंडर × 13 कैननिकल पैरामीटर कवर करती है; `extended` पंक्तियाँ सार्वजनिक API संदर्भों का अनुसरण करती हैं (upstream त्रयी नहीं) और `lib/rosetta.mjs` में वैसे ही चिह्नित हैं।
- जो होस्ट न `translate/fix` जानते हैं और न ही `session.append` में `ignorable` envelope रखते हैं (प्रकाशित `0.1.0-rc.6`–`0.1.1-rc.2` लाइन और `0.1.2-rc.1`, जो पढ़ते समय अज्ञात इवेंट प्रकारों पर fail closed होता है), वहाँ अनुकूली द्वार ऑडिट append को छोड़ देता है ताकि सत्र लॉग कभी दूषित न हो; इवेंट प्रकार पंजीकृत होने तक उन होस्ट पर in-log ऑडिट दर्पण नहीं मिलता।

## विकास

```sh
pnpm install        # node ^22.19 || >=24
pnpm test           # node --test: 57 टेस्ट (शुद्ध सुइट + वास्तविक-सेवा असेंबली सुइट)
pnpm run check      # tsc checkJs types.d.ts के विरुद्ध
pnpm run verify:self-contained  # निर्भरता स्पेक registry से हल होती हैं
pnpm run verify:artifacts       # सादे Node में ESM फ़ेस import होता है + lib निर्यात मौजूद
node scripts/check-readme-sync.mjs  # पाँच-भाषा README सिंक द्वार (CI में भी)
pnpm pack           # प्रकाशित tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `json-repair`, `schema-validation`, `parameter-mapping`, `llm-api`, `tooling`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — निर्माता और मेंटेनर: अनुवाद तालिका व मरम्मत पाइपलाइन के पोर्ट, प्लगइन सतहें, टेस्ट और पाँच-भाषा दस्तावेज़।

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

### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।
