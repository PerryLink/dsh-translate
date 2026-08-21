<div align="center">

# 🔁 dsh-translate

**DeepSeek Harness 的厂商参数翻译与确定性 JSON 修复。**

*同一请求，适配每家厂商。坏 JSON 修好，绝不编造数据。*

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

## 兼容性

| 方面 | 状态 |
|---|---|
| Harness | DeepSeek Harness `0.1.0-rc.8` |
| Node | `^22.19.0 \|\| >=24.0.0` |
| 形态 | 纯 host JS 插件（无浏览器半） |
| 模型 | 任意模型 —— 修复完全确定性，不增加模型调用 |

## 你能得到什么

一个 bundle 里两个相互独立的表面：

- **`/translate`** —— 厂商参数翻译表：`temperature`、`top_p`、`max_tokens`、`stop`、`system` 等 13 个规范参数，映射到 **11 家厂商**（OpenAI、ERNIE、Qwen、Anthropic、Google、DeepSeek、Mistral、Cohere、xAI、Groq、Azure）。可查任意两家映射、列出厂商/参数，或用 `lib/rosetta.mjs` 的 `transformRequest` 转换整个标准请求。
- **修复层** —— `tools/post-execute` 监听器 + `fix_json` 工具。当成功的工具结果以字符串携带坏 JSON（schema 根为 string 型或无约束 `json` 型，或工具被按名加入名单）时，确定性地修复：markdown 围栏提取、转义修复、去尾逗号、截断闭合、必填字段以显式 `null` 占位补全。**绝不编造数值** —— 修复后仍违反 schema 的结果失败关闭，失败的工具结果也绝不被翻转为成功。

```text
工具结果（成功，JSON 文本）──▶ 提取围栏 ──▶ 解析
    │ 合法? ──▶ schema 校验 ──▶ accept { kind: 'accept', value }（注册表重新校验+重渲染）
    │ 损坏 ──▶ 转义 / 去尾逗号 / 闭合 / null 补全 ──▶ 校验
    │ 无法修复 ──▶ next()（保留原值）+ translate/fix 审计（只记计数）
```

## 快速开始

```sh
# 1. 把 bundle 装进你的 profile
dsh plugin --profile web add "github:PerryLink/dsh-translate#main"

# 或从 npm 安装（正式发布版）
dsh plugin --profile web add dsh-translate

# 2. 重启并核实行
dsh --profile web --dump-config | grep -A2 'id: dsh-translate'
```

然后让 agent 查映射或修复载荷：

```
> /translate openai ernie max_tokens
> 用 fix_json 修复: {"a": 1,}，schema 为 {"type":"object","properties":{"a":{"type":"integer"}},"required":["a"]}
```

## 安装与卸载

- **git 通道**（最新 `main`）：`dsh plugin --profile web add "github:PerryLink/dsh-translate#main"` —— 纯 JS，无构建步骤。
- **npm 通道**（正式发布版）：`dsh plugin --profile web add dsh-translate`。
- **tarball 通道**：在本仓库执行 `pnpm pack`，然后 `dsh plugin --profile web add ./dsh-translate-<version>.tgz`。
- **卸载**：`dsh plugin --profile web remove dsh-translate`（或从 profile patch 中删除该行）。

## 配置

所有可调项都是 Schemastery `Config` 字段（可在 cordis.yml 中修改）。按 id 定向覆盖会替换整行 —— 需要重新声明每个键。`cordis.patch.yml` 内联说明了每个键。

| 键 | 默认值 | 含义 |
|---|---|---|
| `enabled` | `true` | 总开关；`false` 不注册任何东西 |
| `repair.enabled` | `true` | post-execute 修复层开关 |
| `repair.toolNames` | `[]` | 额外按名加入修复的 JSON 文本工具（叠加于 string 根/`json` 根 schema） |
| `repair.strategies.escapeRepair` | `true` | 转义字符串内的裸控制字符 |
| `repair.strategies.trailingComma` | `true` | 删除闭合括号前的逗号 |
| `repair.strategies.truncationClosure` | `true` | 闭合因截断而未闭合的字符串或容器 |
| `repair.strategies.fieldCompletion` | `true` | 以显式 `null` 占位补全缺失的必填字段 |
| `repair.maxSteps` | `8` | 策略应用预算（修复循环轮数，1..64） |
| `diffMaxChars` | `200` | 单条日志 diff 片段的字符上限 |
| `diffMaxEntries` | `50` | 日志 diff 条目上限 |
| `registerCommand` | `true` | 注册 `/translate` 命令 |
| `registerTool` | `true` | 注册 `fix_json` 工具 |

profile patch 中的覆盖示例：

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

## 工具与界面

| 界面 | 类型 | 说明 |
|---|---|---|
| `/translate` | 命令 | `vendors`、`params`，或 `<from> <to> [param]` 两两映射 |
| `fix_json` | 工具 | `{ text, schema?, strategies? }` → `{ ok, repaired?, diff?, strategies, truncated, validated, error? }`；diff 片段有界且脱敏 |
| post-execute 修复 | 监听器 | 对 string 根/`json` 根 schema（加 `repair.toolNames`）的成功字符串结果自动生效；不认领时永远 `next()` |

## 权限与数据

- **权限**：无网络、无子进程、无凭据 —— 只消费官方 `commands` 与 `tools` 服务并写会话日志。
- **数据**：修复绝不编造数值；模型可见的增量只有修复后的规范值与 `fix_json` 的 diff。会话审计事件（`translate/fix`）只记工具名、call id、策略名、编辑条数与截断标志 —— 绝不记载荷。

## 安全边界

- **只做确定性修复。** 修复是有界文本手术；JSON-Schema-Enforcer-Proxy 上游的 LLM 重试臂被有意不移植 —— post-execute 监听器绝不调用模型。
- **失败关闭。** 无法修复的语法与 schema 违例保持原结果不变（或由 `fix_json` 返回结构化错误）；`null` 占位仅在 schema 接受 `null` 时落地。
- **敌意输入有界。** 不支持的 schema 关键字与循环 schema 被拒绝；`oneOf` 校验受深度（`MAX_ONE_OF_DEPTH`）与分支预算（`MAX_ONE_OF_BUDGET`）限制，指数级 schema 无法耗尽进程。
- **载荷零泄漏。** 日志与审计事件绝不包含修复后的载荷；diff 在展示或存储前先截断并限条。

## 已知限制

- 支持的 JSON Schema 子集与 harness 工具注册表一致（`type`/`oneOf`/`properties`/`required`/`additionalProperties`/`items`/`enum`/`const`）；其他关键字按不支持拒绝，而非静默忽略。
- 修复只作用于规范值为 JSON 文本字符串的成功结果；已因 schema 校验失败的结果按失败到达，绝不翻转。
- 翻译表覆盖 11 家厂商 × 13 个规范参数；`extended` 行按公开 API 参考扩展（非上游三家），并在 `lib/rosetta.mjs` 中标注。

## 开发

```sh
pnpm install        # node ^22.19 || >=24
pnpm test           # node --test：57 个测试（纯函数套件 + 真实服务装配套件）
pnpm run check      # tsc checkJs，对照 types.d.ts
pnpm run verify:self-contained  # 依赖声明全部来自 registry
pnpm run verify:artifacts       # 纯 Node 下 ESM 面可 import + lib 导出齐全
node scripts/check-readme-sync.mjs  # 五语 README 同步门（CI 同样执行）
pnpm pack           # 发布用 tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `json-repair`, `schema-validation`, `parameter-mapping`, `llm-api`, `tooling`

## Contributors

- [@PerryLink](https://github.com/PerryLink) —— 创建者与维护者：翻译表与修复管线移植、插件表面、测试与五语文档。

## PerryLink DSH Plugin Family

本项目是由 [PerryLink](https://github.com/PerryLink) 维护的 [29 个 DeepSeek Harness 插件](https://github.com/PerryLink)之一。如果这个对你有用，其他插件很可能也会：

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | 审批链上的第二模型自动审查，默认失败关闭 |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | 持久化后台子代理，带 Web UI 侧边栏、消息与打断 |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | DeepSeek Harness 的成本治理：预算、碳排与延迟一屏呈现。 |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind 等价物：快照、会话分叉、一次性恢复 |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | 将 Claude Code 会话、记忆、技能与 CLAUDE.md 迁入 DSH |
| [dsh-click](https://github.com/PerryLink/dsh-click) | 跨平台原生桌面控制（DeepSeek Harness），Windows 优先。 |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Web 输入框的终端式输入历史：方向键、Ctrl+R 搜索 |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | DeepSeek Harness 的提示注入、越狱与密钥泄露防护。 |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | 工程纪律门禁：需求质询、测试门禁、对抗式审查 |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | DeepSeek Harness 的统一静态图像生成路由。 |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | DeepSeek Harness 的只读性能诊断。 |
| [dsh-github](https://github.com/PerryLink/dsh-github) | DSH 的 GitHub PR/issue 集成，每次写入都经审批门 |
| [dsh-library](https://github.com/PerryLink/dsh-library) | DeepSeek Harness 的本地文档知识库。 |
| [dsh-local-ai](https://github.com/PerryLink/dsh-local-ai) | DeepSeek Harness 的本地模型（Ollama）接入。 |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | 经语言服务器的 LSP 诊断、格式化、补全、代码操作与重命名 |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | DeepSeek Harness 的 PII 脱敏中间件——数据到模型前匿名化，展示层还原。 |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | 只读 MCP 运行时面板：/mcp 命令 + 带状态、工具与错误的设置页 |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | 带审批门的跨会话记忆：ctx.memory 接缝 + SQLite + memory 工具 |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | DeepSeek Harness 的 OpenTelemetry 与 Langfuse 可观测导出器。 |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles 等价的运行时样式切换 |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code 风格声明式 allow/deny/ask 权限规则，带审计 |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | 按需 agent 技能形式的插件开发知识库 |
| [dsh-score](https://github.com/PerryLink/dsh-score) | DeepSeek Harness 插件的多指标质量评分。 |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | 在 Web 侧边栏置顶会话，顺序持久化 |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | DeepSeek Harness 的跨设备会话同步——会话存储的专用 git 镜像。 |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | 安全审计技能包：密钥扫描、依赖与供应链审查 |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | DeepSeek Harness 的语音优先会话闭环：对它说，听它答。 |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | DeepSeek Harness 插件的隔离式安装冒烟实测。 |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | DeepSeek Harness 的厂商参数翻译与确定性 JSON 修复。 |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-translate contributors
