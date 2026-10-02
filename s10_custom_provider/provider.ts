/**
 * 自定义 provider 扩展 —— 注册一个本地 OpenAI 兼容端点。
 *
 * 用法（作为普通扩展）：
 *   LOCAL_OPENAI_API_KEY=xxx pi -e ./s10_custom_provider/provider.ts --provider local-openai --model qwen2.5-coder:7b
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function localProvider(pi: ExtensionAPI) {
	pi.registerProvider("local-openai", {
		// 任何 OpenAI 兼容服务：Ollama / LM Studio / vLLM / llama.cpp server …
		baseUrl: process.env.LOCAL_BASE_URL ?? "http://localhost:11434/v1",
		// "$ENV_NAME" 表示运行时从环境变量取，不把密钥写进配置。
		apiKey: "$LOCAL_OPENAI_API_KEY",
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
}
