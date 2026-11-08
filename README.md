# dsh-translate

**把整个界面翻成你的语言——用你自己的 DSH 模型，代码、路径、命令和专名一个都不动。**

DeepSeek Harness 的整页翻译插件：浏览器半边遍历当前页面上的可见文字，把需要保留的片段（代码块与行内代码、文件路径、shell 命令、URL、标识符、版本号、哈希、数字、产品名）先遮成 `⟦n⟧` 占位符，再把剩下的散文交给宿主半边；宿主用**你当前会话已经配置好的模型路由**翻译，把结果交回浏览器，浏览器把占位符还原后写回原来的文本节点。原文一直留在内存里，点一下「原文」就整体还原。

只改显示层：**不写会话日志、不改工作区文件、不把译文落盘**。会话记录里永远是模型真正说过的话。

> **0.3.0 起，`dsh-translate` 是整页翻译插件。** 原来的「厂商参数映射 + 确定性 JSON 修复」已改名为
> [`dsh-param-repair`](https://github.com/PerryLink/dsh-param-repair)（1.0.0）。如果你是从 0.2.x 升上来的，
> 要保留原功能请安装 `dsh-param-repair` 并移除本行；旧配置键（`repair.*`、`rosettaDataPath`）在新插件里会被忽略，
> 不会导致 profile 加载失败。

## 翻什么，不翻什么

| 会翻译 | 原样保留 |
|---|---|
| 助手回复、推理摘要、工具输出里的散文 | 代码块与行内代码（`code` / `pre`） |
| Markdown 标题、列表、表格、链接文字 | 文件路径、glob、命令与参数、URL、邮箱 |
| 按钮、标签、设置项等界面文案 | JSON 键、环境变量、`dsh-*` / `snake_case` / `camelCase` 标识符 |
| 页面里其它插件的可见文字 | 版本号、哈希、纯数字、`⟦n⟧` 占位符本身 |
| —— | 词表里的产品名：DeepSeek Harness、Cordis、npm、GitHub、Gitee、GitCode、Phocinae、PerryLink 等 |

判定规则：一个文本节点里如果**没有任何可翻译的散文**（例如整段都是路径或代码），直接跳过；如果模型丢掉、改了或新增了占位符，这一段就放弃翻译、保留原文，而不是把半个占位符写进页面。

## 安装

```sh
dsh plugin --profile <name> add dsh-translate
```

装好后重载 Web GUI，页面右下角会出现「译」按钮：点一次开始整页翻译（按钮变成「原文」），再点一次还原。

## 运行前提

翻译走**你自己的模型**，插件不内置 key、不内置 provider：

1. 当前 profile 里要有 `llm` 服务和一个可用的 provider（正常对话能跑就满足）；
2. 路由默认取**最近一条 `request/header`**——也就是说，先在任意会话里发过一条消息最稳；也可以在配置里显式写死 `provider` / `model`。

没路由时按钮会显示原因（例如 `no model route: ...`），页面不会被改动。

## 配置

`cordis.patch.yml` 里的每一格都是 Schemastery 字段，写错会在 profile 加载时直接报错：

| 键 | 默认 | 含义 |
|---|---|---|
| `enabled` | `true` | 总开关；`false` 时宿主不挂载任何东西 |
| `targetLang` | `''` | 目标语言；空 = 跟随 Web GUI 当前语言（英文界面时跟随浏览器语言） |
| `provider` / `model` | `''` | 可选显式路由，**要么都填要么都空**；空 = 用最近会话的路由 |
| `maxSegments` | `40` | 单次模型调用的段数上限（1–200） |
| `maxChars` | `6000` | 单次模型调用的字符上限（200–40000） |
| `timeoutMs` | `60000` | 单次调用超时（1000–600000） |
| `glossary` | `[]` | 额外要求原样保留的词（产品名、内部系统名等） |

例：强制翻成日文，并把内部系统名加进词表：

```yaml
- id: dsh-translate
  name: dsh-translate
  config:
    enabled: true
    targetLang: ja
    glossary: [Acme Ledger, 内部工单系统]
```

## 成本与隐私

- **只翻可见文字，按需触发**：默认不会在后台自动跑；点按钮才开始，关掉就停。
- **结果缓存**：同一段原文（同一目标语言）只翻一次，缓存在浏览器 `localStorage`（上限 600 条），清掉站点数据即消失。
- **出网内容**：只有被遮掉受保护片段之后的散文会发给你配置的模型 provider；路径、代码、命令、密钥形态的标识符不会作为可翻译文本发出。
- **不落盘**：译文只存在于当前页面的 DOM 和浏览器缓存；会话日志、工作区、DSH 配置都不写。
- **不碰凭据**：插件不读也不保存任何 API key；鉴权完全走宿主已有的 provider 配置。

## 已知限制

- 翻译发生在**渲染层**：React 重新渲染某个节点时会把原文写回，插件的 MutationObserver 会用缓存把译文再贴回去（不会重复调用模型）；极端情况下会看到一次极短的闪动。
- 流式输出期间文字一直在变，插件等一小段安静期（350ms）再翻；正在生成的长回复可能延迟出现译文。
- 图片里的文字、Canvas、PDF 预览不做 OCR。
- 隐藏元素（`display:none` 的弹窗等）不会被遍历；打开后由观察器补翻。
- 界面本身已有 8 种内置语言（en / zh / ja / es / fr / de / ru / pt）；本插件翻的是**内容**和第三方插件的英文文案，不替代内置 locale。

## 开发

```sh
pnpm install
pnpm test        # 21 个用例：遮罩/还原、占位符校验、批处理、路由解析、jsdom DOM 行为、两端 descriptor 一致性
pnpm run lint
```

结构：

- `index.mjs` — 宿主插件入口（Config + 挂载服务）
- `lib/service.mjs` — `translatePage` Typert 服务（status / translate）
- `lib/engine.mjs` — 提示词、批处理、解析、占位符校验（无 cordis / 无 DOM，可单测）
- `lib/wire.mjs` — 两端共享的调用描述符
- `typert.host.mjs` — 宿主 Typert 清单
- `client/index.js` — 手写客户端包：DOM 遍历、遮罩、缓存、浮动按钮

## License

Apache-2.0。社区插件，与 DeepSeek 官方无关。
