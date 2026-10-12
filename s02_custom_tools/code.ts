/**
 * s02: 自定义工具 — 加一个能力，只加一个 handler
 *
 * 定义两个工具，注册进 customTools。主循环一行不改。
 * 工具把数据写进当前目录的 .todos.json。
 *
 * Define two tools and register them into customTools. The main loop is untouched.
 * The tools write data into .todos.json in the current directory.
 *
 * 运行 / Run:
 *   npm run s02
 *   npm run s02 -- "把'复习权限闸门'、'跑步'加入待办，优先级 1 和 5，然后列出来"
 */

import { resolve } from "node:path";
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import { createTodoTools } from "./tools.ts";

const TODOS_FILE = resolve(process.cwd(), ".todos.json");
const todoTools = createTodoTools(TODOS_FILE);

// customTools 就是工具的注册入口，pi 负责把它转成模型可见的工具定义并 dispatch。
// customTools is the registration point; pi turns these into model-visible tool definitions and dispatches them.
const { session } = await createAgentSession({
	customTools: todoTools,
	sessionManager: SessionManager.inMemory(),
});

const unsubscribe = session.subscribe((event) => {
	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		process.stdout.write(event.assistantMessageEvent.delta);
	}
	// 打印每次工具调用，确认模型确实在调我们的工具。
	// Print each tool call to confirm the model really calls our tools.
	if (event.type === "tool_execution_start") {
		console.error(`\n[tool] ${event.toolName}`);
	}
});

const prompt =
	process.argv.slice(2).join(" ") ||
	"把'看 s02 的 store.ts'和'跑步'加入待办，优先级分别 1 和 5，然后列出全部待办";

try {
	await session.prompt(prompt);
	console.log();
} finally {
	unsubscribe();
	session.dispose();
}
