/**
 * s10: 自定义 Provider — 接上自己的模型服务
 *
 * 两条路径：
 *   1. 编程式：ModelRuntime.registerProvider()，本章演示。
 *   2. 扩展式：provider.ts 里的 pi.registerProvider()，让 CLI/TUI 也能用。
 *
 * 不需要真的启动推理服务，本章只验证注册与模型选择生效。
 *
 * 运行：
 *   npm run s10
 */

import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

// 默认会读 ~/.pi/agent/models.json 与 auth.json。
const runtime = await ModelRuntime.create();

runtime.registerProvider("local-openai", {
	// 任何 OpenAI 兼容服务：Ollama / LM Studio / vLLM / llama.cpp server …
	baseUrl: process.env.LOCAL_BASE_URL ?? "http://localhost:11434/v1",
	apiKey: process.env.LOCAL_OPENAI_API_KEY ?? "not-needed",
	api: "openai-completions",
	models: [
		{
			id: "qwen2.5-coder:7b",
			name: "Qwen2.5 Coder 7B (local)",
			reasoning: false,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 32768,
			maxTokens: 8192,
		},
	],
});

console.log(`已注册的 provider id：${runtime.getRegisteredProviderIds().join(", ")}`);

const model = runtime.getModel("local-openai", "qwen2.5-coder:7b");
if (!model) {
	console.error("未找到模型 local-openai/qwen2.5-coder:7b");
	process.exit(1);
}
console.log(`找到模型：${model.provider}/${model.id}  context=${model.contextWindow}  maxTokens=${model.maxTokens}`);

// 把它设为会话模型（不真正发请求，因为本地服务没起）。
const { session } = await createAgentSession({
	model,
	modelRuntime: runtime,
	sessionManager: SessionManager.inMemory(),
});
console.log(`会话当前模型：${session.model?.provider}/${session.model?.id}`);
session.dispose();

console.log("\n在 CLI/TUI 里使用扩展式注册：");
console.log("  LOCAL_OPENAI_API_KEY=xxx pi -e ./s10_custom_provider/provider.ts --provider local-openai --model qwen2.5-coder:7b");
console.log("或在 ~/.pi/agent/models.json 里声明自定义模型（无需写代码）。");
