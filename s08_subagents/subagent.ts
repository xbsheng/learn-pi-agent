/**
 * 子 agent 运行器 —— 新开一个隔离的 AgentSession，跑完只返回最终文本。
 */

import {
	createAgentSession,
	DefaultResourceLoader,
	getAgentDir,
	SessionManager,
} from "@earendil-works/pi-coding-agent";

/** 从消息列表里提取最后一条 assistant 的纯文本。 */
export function lastAssistantText(messages: readonly { role: string; content: unknown }[]): string {
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const message = messages[i];
		if (message.role !== "assistant") continue;
		if (typeof message.content === "string") return message.content;
		if (Array.isArray(message.content)) {
			const text = message.content
				.map((block) => (block && typeof block === "object" && "type" in block && block.type === "text" && "text" in block ? String(block.text) : ""))
				.join("");
			if (text.trim()) return text;
		}
	}
	return "(子 agent 没有产生文本结论)";
}

export interface RunSubagentOptions {
	systemPrompt?: string;
	tools?: string[];
	onProgress?: (delta: string) => void;
	signal?: AbortSignal;
}

export async function runSubagent(task: string, options: RunSubagentOptions = {}): Promise<string> {
	const {
		systemPrompt = "你是一个专注的子 agent。只完成交给你的任务，最后用简洁的结论回答，不要寒暄。",
		tools = ["read", "grep", "find", "ls"],
		onProgress,
		signal,
	} = options;

	const loader = new DefaultResourceLoader({
		cwd: process.cwd(),
		agentDir: getAgentDir(),
		systemPromptOverride: () => systemPrompt,
		// 子 agent 不继承全局的追加提示，保持干净。
		appendSystemPromptOverride: () => [],
	});
	await loader.reload();

	const { session } = await createAgentSession({
		resourceLoader: loader,
		sessionManager: SessionManager.inMemory(),
		tools,
	});

	const unsubscribe = session.subscribe((event) => {
		if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
			onProgress?.(event.assistantMessageEvent.delta);
		}
	});

	const onAbort = () => void session.abort();
	signal?.addEventListener("abort", onAbort, { once: true });

	try {
		await session.prompt(task);
		return lastAssistantText(session.agent.state.messages);
	} finally {
		signal?.removeEventListener("abort", onAbort);
		unsubscribe();
		session.dispose();
	}
}
