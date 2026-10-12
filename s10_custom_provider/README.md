[English](README.en.md) | 中文

# s10: 自定义 Provider — 模型不止一家，接上自己的

[s09](../s09_rpc/) → `s10` → [s11](../s11_pi_packages/) → ...
> *"模型不止一家，接上自己的"* — pi 的模型层是开放的。
>
> **Harness 层**：模型接入 — 让 harness 不被单一供应商锁死。

---

## 问题

pi 内置支持 Anthropic、OpenAI、Gemini、DeepSeek、Groq、Bedrock 等一堆供应商。但你可能：

- 公司内网部署了 vLLM / Ollama，想用私有模型。
- 用了某个 OpenAI 兼容的第三方推理服务，pi 没有内置。
- 想给同一个服务声明多个模型条目（不同上下文窗口、不同价格）。

这些都不该要求你 fork pi。

## 解决方案

两条路径，任选：

**A. 编程式（SDK）** —— 用 `ModelRuntime.registerProvider()`：

```typescript
const runtime = await ModelRuntime.create();

runtime.registerProvider("local-openai", {
  baseUrl: "http://localhost:11434/v1",   // 任何 OpenAI 兼容端点
  apiKey: "not-needed",
  api: "openai-completions",
  models: [{
    id: "qwen2.5-coder:7b",
    name: "Qwen2.5 Coder 7B (local)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 32768,
    maxTokens: 8192,
  }],
});

const model = runtime.getModel("local-openai", "qwen2.5-coder:7b");
const { session } = await createAgentSession({ model, modelRuntime: runtime });
```

**B. 扩展式** —— 用 `pi.registerProvider()`，让 CLI/TUI 也能用：

```typescript
export default function (pi: ExtensionAPI) {
  pi.registerProvider("local-openai", {
    baseUrl: process.env.LOCAL_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: "$LOCAL_OPENAI_API_KEY",   // $ENV 表示运行时从环境变量取
    api: "openai-completions",
    models: [ /* ... */ ],
  });
}
```

```bash
LOCAL_OPENAI_API_KEY=xxx pi -e ./provider.ts --provider local-openai --model qwen2.5-coder:7b
```

## 工作原理

### 一个 provider 配置的字段

| 字段 | 说明 |
|---|---|
| `baseUrl` | API 根地址，OpenAI 兼容服务通常以 `/v1` 结尾 |
| `api` | 协议类型：`openai-completions`、`anthropic-messages` 等 |
| `apiKey` | 直接写密钥，或 `$ENV_NAME` 引用环境变量 |
| `models[]` | 每个模型的元数据：`id`、`contextWindow`、`maxTokens`、`input`、`cost`、`reasoning` |

`contextWindow` 和 `maxTokens` 不是装饰品：pi 用它们决定何时触发压缩、如何截断输出。填错了，要么频繁无谓压缩，要么在超限时被 API 拒绝。

### 认证解析优先级

`ModelRuntime` 按顺序找凭证：

1. 运行时覆盖（`setRuntimeApiKey`，不持久化）
2. `auth.json` 里的存储凭证（API key 或 OAuth）
3. 环境变量（`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`…）
4. 自定义 provider 的 fallback（`models.json` 里的 key）

### 第三种方式：models.json

如果你只想加模型条目、不想写代码，直接编辑 `~/.pi/agent/models.json`。pi 启动时自动加载，`pi --list-models` 能看到。扩展式适合需要动态发现模型的场景（比如启动时 fetch 本地服务的 `/v1/models`）。

### 异步工厂：动态发现模型

扩展工厂可以是 async 的，在启动时拉取可用模型：

```typescript
export default async function (pi: ExtensionAPI) {
  const res = await fetch("http://localhost:1234/v1/models");
  const { data } = await res.json();
  pi.registerProvider("local-openai", {
    baseUrl: "http://localhost:1234/v1",
    api: "openai-completions",
    models: data.map((m) => ({ id: m.id, /* ... */ })),
  });
}
```

pi 会等这个 Promise 完成再继续启动，所以 `pi --list-models` 也能看到动态发现的模型。

## 变更内容

| 组件 | s09 | s10 |
|---|---|---|
| 模型来源 | pi 内置供应商 | 内置 + 自定义 provider |
| 接入方式 | 登录 / 配置 | `registerProvider()` |
| 密钥 | — | `$ENV_NAME` 引用环境变量 |
| 模型元数据 | 内置 | 自己声明 `contextWindow` / `cost` |
| 循环 | 不变 | 不变 |

## 试一下

```bash
npm run s10
```

不需要真的起推理服务：脚本注册 provider、取出模型、把它设为会话模型并打印。要真跑推理，启动 Ollama 后：

```bash
ollama serve &
ollama pull qwen2.5-coder:7b
LOCAL_OPENAI_API_KEY=x pi -e ./s10_custom_provider/provider.ts \
  --provider local-openai --model qwen2.5-coder:7b -p "写一个快排"
```

再试几个：

- 把 `baseUrl` 指向一个不存在的端口再跑 `npm run s10` —— 注册仍然成功，说明本章只验证配置层
- 在 `models` 里再加一个 `qwen2.5-coder:14b` 条目，用 `runtime.getModel` 取出来打印
- 把 `apiKey` 改成 `"$LOCAL_OPENAI_API_KEY"`，不设环境变量，观察 `provider.ts` 的行为

## 本章要点

- `ModelRuntime.registerProvider()`（SDK）或 `pi.registerProvider()`（扩展）接入任意 OpenAI 兼容服务。
- `$ENV_NAME` 引用环境变量，别把密钥写进代码。
- `contextWindow` / `maxTokens` 直接影响压缩与截断行为，必须填对。
- 不写代码的选项是 `~/.pi/agent/models.json`。

## 下一章

到目前为止你的扩展、技能、模板都散落在本地。**s11：Pi Package** 把它们打包成一个可安装、可分享的单元。