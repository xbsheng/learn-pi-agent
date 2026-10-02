/**
 * s01: AgentSession — pi 已经转着循环
 *
 * 一次 prompt() 就是一个完整的 agent loop：
 * 模型决定调不调工具，pi 负责执行、追加结果、回到模型，直到模型停下。
 *
 * 运行：
 *   npm run s01
 *   npm run s01 -- "列出当前目录并总结"
 */

import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

// 1. 创建一个会话。inMemory 表示不落盘，适合脚本。
const { session } = await createAgentSession({
	sessionManager: SessionManager.inMemory(),
});

// 2. 订阅事件，把模型流式吐出的文本打到终端。
const unsubscribe = session.subscribe((event) => {
	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		process.stdout.write(event.assistantMessageEvent.delta);
	}
});

// 3. 发一条 prompt。它会等到整个 run 结束（含所有工具调用与重试）才返回。
const prompt = process.argv.slice(2).join(" ") || "用一句话介绍当前目录是一个什么项目";
try {
	await session.prompt(prompt);
	console.log();
} finally {
	// 4. 清理，释放会话资源。
	unsubscribe();
	session.dispose();
}
