/**
 * s08: 子 Agent — 给子任务一份全新的 messages[]
 *
 * 注册一个 delegate 工具：它开一个隔离的、只读的子会话跑任务，
 * 只把最终结论作为 tool_result 返回主会话。
 *
 * Register a delegate tool: it opens an isolated, read-only child session to run the task,
 * and returns only the final conclusion to the main session as a tool_result.
 *
 * 运行 / Run:
 *   npm run s08
 *   npm run s08 -- "让子 agent 统计 s01 到 s08 各章 code.ts 的行数，你只汇总成一张表"
 */

import { Type } from "typebox";
import { createAgentSession, defineTool, SessionManager } from "@earendil-works/pi-coding-agent";
import { runSubagent } from "./subagent.ts";

const delegate = defineTool({
	name: "delegate",
	label: "Delegate",
	description:
		"把一段自包含的调查任务交给子 agent（独立上下文、只读工具），返回它的最终结论。当任务需要读很多文件或多步调查、而主流程只关心结论时使用。",
	parameters: Type.Object({
		task: Type.String({
			description: "自包含的任务描述。子 agent 看不到本会话历史，必须写清楚要什么、范围、输出格式。",
		}),
	}),
	async execute(_toolCallId, params, signal, onUpdate) {
		// onUpdate 把子 agent 的进度冒泡到主会话 UI。
		// onUpdate bubbles the subagent's progress up to the main session UI.
		onUpdate?.({ content: [{ type: "text", text: "子 agent 开始工作…" }] });
		const answer = await runSubagent(
			`当前工作目录：${process.cwd()}\n\n任务：${params.task}`,
			{
				onProgress: (delta) => onUpdate?.({ content: [{ type: "text", text: delta }] }),
				signal,
			},
		);
		return {
			// content 放结论（喂回主模型），details 放元数据（不进入上下文）。
			// content holds the conclusion (fed back to the model); details holds metadata (not in context).
			content: [{ type: "text", text: answer }],
			details: { isolated: true, tools: ["read", "grep", "find", "ls"] },
		};
	},
});

const { session } = await createAgentSession({
	customTools: [delegate],
	sessionManager: SessionManager.inMemory(),
});

const unsubscribe = session.subscribe((event) => {
	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		process.stdout.write(event.assistantMessageEvent.delta);
	}
	if (event.type === "tool_execution_start") {
		console.error(`\n[主会话工具 / main-session tool] ${event.toolName}`);
	}
});

const prompt =
	process.argv.slice(2).join(" ") ||
	"用 delegate 让子 agent 统计 s01 到 s08 各章 code.ts 的行数，你只把结果汇总成一张 markdown 表格";

try {
	await session.prompt(prompt);
	console.log(`\n\n[主会话消息数 / main-session messages] ${session.agent.state.messages.length}`);
} finally {
	unsubscribe();
	session.dispose();
}
