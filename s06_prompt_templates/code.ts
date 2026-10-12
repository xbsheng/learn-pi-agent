/**
 * s06: Prompt 模板 — 一条斜杠命令展开一段提示词
 *
 * 把 prompts/review.md 注入会话，然后用 "/review <path>" 触发。
 * 展开发生在发送前：模型看到的是模板正文，不是 "/review" 这个词。
 *
 * Inject prompts/review.md into the session, then trigger it with "/review <path>".
 * Expansion happens before sending: the model sees the template body, not the word "/review".
 *
 * 运行 / Run:
 *   npm run s06
 *   npm run s06 -- "s02_custom_tools/store.ts"
 */

import { resolve } from "node:path";
import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({
	cwd: process.cwd(),
	agentDir: getAgentDir(),
	// 把本章的 prompts/ 目录加进发现路径，等价于放到 .pi/prompts/。
	// Add this chapter's prompts/ directory to the discovery paths, equivalent to .pi/prompts/.
	additionalPromptTemplatePaths: [resolve(import.meta.dirname, "prompts")],
});
await loader.reload();

const { session } = await createAgentSession({
	resourceLoader: loader,
	sessionManager: SessionManager.inMemory(),
});

const unsubscribe = session.subscribe((event) => {
	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		process.stdout.write(event.assistantMessageEvent.delta);
	}
});

const target = process.argv.slice(2).join(" ") || "s02_custom_tools/store.ts";

try {
	// expandPromptTemplates: true 才会把 /review 展开成模板正文。
	// Only expandPromptTemplates: true turns /review into the template body.
	await session.prompt(`/review ${target}`, { expandPromptTemplates: true });
	console.log();
} finally {
	unsubscribe();
	session.dispose();
}
