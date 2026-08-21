<div align="center">

# 🔁 dsh-translate

**DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और निर्धारक JSON मरम्मत।**

*एक ही अनुरोध, हर वेंडर पर। टूटा JSON, बिना डेटा गढ़े ठीक।*

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

## संगतता

| सतह | स्थिति |
|---|---|
| Harness | DeepSeek Harness `0.1.0-rc.8` |
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
- **डेटा**: मरम्मत कभी मान नहीं गढ़ती; मॉडल-दृश्य जोड़ केवल मरम्मत किया गया कैननिकल मान और `fix_json` का diff हैं। सत्र ऑडिट इवेंट (`translate/fix`) में केवल टूल नाम, call id, रणनीति नाम, संपादन गिनती और ट्रंकेशन ध्वज होते हैं — कभी payload नहीं।

## सुरक्षा सीमाएँ

- **केवल निर्धारक।** मरम्मत सीमित टेक्स्ट सर्जरी है; upstream JSON-Schema-Enforcer-Proxy की LLM-पुनर्प्रयास शाखा जानबूझकर पोर्ट नहीं की गई — post-execute श्रोता कभी मॉडल नहीं बुलाता।
- **Fail closed।** अमरम्मत योग्य सिंटैक्स और स्कीमा उल्लंघन मूल परिणाम को यथावत छोड़ते हैं (या `fix_json` से संरचित त्रुटि लौटाते हैं); `null` प्लेसहोल्डर तभी लगते हैं जब स्कीमा `null` स्वीकारे।
- **शत्रु इनपुट सीमित।** असमर्थित स्कीमा कीवर्ड और वृत्ताकार स्कीमा अस्वीकार होते हैं; `oneOf` सत्यापन गहराई (`MAX_ONE_OF_DEPTH`) और शाखा बजट (`MAX_ONE_OF_BUDGET`) से सीमित है, इसलिए घातीय स्कीमा प्रक्रिया को नहीं थका सकती।
- **Payload रिसाव शून्य।** लॉग और ऑडिट इवेंट में कभी मरम्मत किया गया payload नहीं होता; diff दिखाने या रखने से पहले काटे और सीमित किए जाते हैं।

## ज्ञात सीमाएँ

- समर्थित JSON Schema उपसमुच्चय हार्नेस टूल रजिस्ट्री जैसा है (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const`); अन्य कीवर्ड असमर्थित कहकर अस्वीकार होते हैं, चुपचाप नज़रअंदाज़ नहीं।
- मरम्मत केवल उन सफल परिणामों पर लागू होती है जिनका कैननिकल मान JSON-टेक्स्ट स्ट्रिंग है; स्कीमा सत्यापन में पहले ही विफल मान विफल परिणाम के रूप में आता है और कभी पलटा नहीं जाता।
- तालिका 11 वेंडर × 13 कैननिकल पैरामीटर कवर करती है; `extended` पंक्तियाँ सार्वजनिक API संदर्भों का अनुसरण करती हैं (upstream त्रयी नहीं) और `lib/rosetta.mjs` में वैसे ही चिह्नित हैं।

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

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [29 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | अनुमोदन श्रृंखला पर दूसरे मॉडल से स्वतः-समीक्षा, डिफ़ॉल्ट रूप से असफल-बंद |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Web UI साइडबार, संदेश और रुकावट के साथ स्थायी पृष्ठभूमि चाइल्ड एजेंट |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | DeepSeek Harness के लिए लागत प्रशासन: बजट, कार्बन और विलंबता एक पैनल में। |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind-समतुल्य: स्नैपशॉट, सत्र फोर्क, एक-बार पुनर्स्थापन |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Claude Code सत्र, स्मृति, skills और CLAUDE.md को DSH में स्थानांतरित करें |
| [dsh-click](https://github.com/PerryLink/dsh-click) | DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले। |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Web कंपोज़र के लिए टर्मिनल-शैली इनपुट इतिहास: तीर, Ctrl+R खोज |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | DeepSeek Harness के लिए प्रॉम्प्ट-इंजेक्शन, जेलब्रेक और सीक्रेट-लीक रक्षा। |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | इंजीनियरिंग-अनुशासन गार्ड: आवश्यकताएँ पूछताछ, परीक्षण द्वार, विरोधी समीक्षा |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | DeepSeek Harness के लिए एकीकृत स्थैतिक-छवि निर्माण रूटिंग। |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | DeepSeek Harness के लिए केवल-पठन प्रदर्शन निदान। |
| [dsh-github](https://github.com/PerryLink/dsh-github) | DSH के लिए GitHub PR/issues एकीकरण, हर लेखन अनुमोदन-द्वारित |
| [dsh-library](https://github.com/PerryLink/dsh-library) | DeepSeek Harness के लिए स्थानीय दस्तावेज़ ज्ञानकोश। |
| [dsh-local-ai](https://github.com/PerryLink/dsh-local-ai) | DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण। |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | भाषा सर्वरों पर LSP निदान, फ़ॉर्मेटिंग, पूर्णता, कोड क्रियाएँ और नाम बदलना |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | DeepSeek Harness के लिए PII मास्किंग मिडलवेयर — मॉडल तक पहुँचने से पहले व्यक्तिगत डेटा अनाम करता है, प्रदर्शन परत पर बहाल करता है। |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | केवल-पठन MCP रनटाइम पैनल: /mcp कमांड + स्थिति, टूल और त्रुटियों वाला सेटिंग टैब |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | अनुमोदन-द्वारित क्रॉस-सत्र स्मृति: ctx.memory seam + SQLite + memory टूल |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | DeepSeek Harness के लिए OpenTelemetry और Langfuse अवलोकनीयता निर्यातक। |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles-समतुल्य रनटाइम शैली स्विचिंग |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code-शैली घोषणात्मक allow/deny/ask अनुमति नियम, ऑडिट के साथ |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | माँग-पर एजेंट स्किल के रूप में प्लगइन-विकास ज्ञानकोश |
| [dsh-score](https://github.com/PerryLink/dsh-score) | DeepSeek Harness प्लगइनों के लिए बहु-आयामी गुणवत्ता स्कोरिंग। |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Web साइडबार में सत्र पिन करें, स्थायी क्रम के साथ |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | DeepSeek Harness के लिए क्रॉस-डिवाइस सत्र सिंक — आपके सत्र स्टोर का एक समर्पित git मिरर। |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | सुरक्षा-ऑडिट स्किल पैक: सीक्रेट स्कैन, निर्भरता और आपूर्ति-श्रृंखला समीक्षा |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | DeepSeek Harness के लिए आवाज़-प्रथम सत्र लूप: बोलें और उत्तर सुनें। |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | DeepSeek Harness प्लगइनों के लिए पृथक इंस्टॉल-और-स्मोक परीक्षण। |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और नियतात्मक JSON मरम्मत। |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-translate contributors
