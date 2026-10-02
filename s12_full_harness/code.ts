/**
 * s12: 完整 Harness — 多种机制，一个会话
 *
 * 把前面各章的机制装回同一个 AgentSession：
 *   s02 自定义工具（todo_add / todo_list）
 *   s03 权限闸门（tool_call 拦截）
 *   s04 结果截断（tool_result）
 *   s05 skill 按需加载
 *   s06 prompt 模板
 *   s08 子 agent（delegate）
 *
 * 运行：
 *   npm run s12
 *   npm run s12 -- "把'完成 s12'加入待办，再让子 agent 统计 s01..s11 的 README.md 总字数"
 */

import { resolve } from "node:path";
import { Type } from "typebox";
import { createAgentSession, DefaultResourceLoader, defineTool, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";
import { createTodoTools } from "../s02_custom_tools/tools.ts";
import permissionGate from "../s03_permission_gate/permission.ts";
import truncateToolResults from "../s04_events_and_ui/truncate.ts";
import { runSubagent } from "../s08_subagents/subagent.ts";

const TODOS_FILE = resolve(process.cwd(), ".todos.json");

const delegate = defineTool({
	name: "delegate",
	label: "Delegate",
	description:
		"把自包含的调查任务交给子 agent（独立上下文、只读工具），返回最终结论。适合需要读很多文件但主流程只关心结论的任务。",
	parameters: Type.Object({
		task: Type.String({ description: "自包含的任务描述，写清楚要什么、范围、输出格式。" }),
	}),
	async execute(_toolCallId, params, signal) {
		const answer = await runSubagent(`当前工作目录：${process.cwd()}\n\n任务：${params.task}`, { signal });
		return { content: [{ type: "text", text: answer }], details: { isolated: true } };
	},
});

// ── 装载 harness 机制 ────────────────────────────────────────────
const loader = new DefaultResourceLoader({
	cwd: process.cwd(),
	agentDir: getAgentDir(),
	// s03 权限闸门 + s04 结果截断
	extensionFactories: [permissionGate, truncateToolResults],
	// s05 skill（release-notes）
	additionalSkillPaths: [resolve(import.meta.dirname, "../s05_skills/skills")],
	// s06 prompt 模板（/review）
	additionalPromptTemplatePaths: [resolve(import.meta.dirname, "../s06_prompt_templates/prompts")],
});
await loader.reload();

const { session } = await createAgentSession({
	resourceLoader: loader,
	// s02 自定义工具 + s08 delegate
	customTools: [...createTodoTools(TODOS_FILE), delegate],
	sessionManager: SessionManager.inMemory(),
});

// s04 观察：turn / 工具 / 截断提示
let turn = 0;
const unsubscribe = session.subscribe((event) => {
	switch (event.type) {
		case "turn_start":
			console.error(`\n── turn ${++turn} ──`);
			break;
		case "tool_execution_start":
			console.error(`  [tool→] ${event.toolName}`);
			break;
		case "tool_execution_end":
			console.error(`  [tool←] ${event.toolName} ${event.isError ? "ERROR" : "ok"}`);
			break;
		case "message_update":
			if (event.assistantMessageEvent.type === "text_delta") {
				process.stdout.write(event.assistantMessageEvent.delta);
			}
			break;
		default:
			break;
	}
});

const prompt =
	process.argv.slice(2).join(" ") ||
	"把'完成 s12 集成'加入待办，再让子 agent 统计 s01 到 s11 各章 README.md 的总字数，最后汇总一句";

try {
	await session.prompt(prompt);
	console.log(`\n\n[主会话消息数] ${session.agent.state.messages.length}`);
} finally {
	unsubscribe();
	session.dispose();
}
