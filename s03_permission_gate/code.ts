/**
 * s03: 权限闸门 — 先划边界，再给自由
 *
 * 把 permission.ts 作为内联扩展挂到会话上，再让模型执行几条命令，
 * 观察 tool_call 钩子如何放行 / 拦截。
 *
 * 运行：
 *   npm run s03
 *   npm run s03 -- "依次执行：echo hello、ls、sudo rm -rf /var"
 */

import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";
import permissionGate from "./permission.ts";

const loader = new DefaultResourceLoader({
	cwd: process.cwd(),
	agentDir: getAgentDir(),
	extensionFactories: [permissionGate],
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
	if (event.type === "tool_execution_start") {
		console.error(`\n[tool] ${event.toolName}`);
	}
});

const prompt =
	process.argv.slice(2).join(" ") ||
	"请依次用 bash 执行这四条命令并汇报结果：echo hello、ls、sudo rm -rf /var、rm -rf ./dist";

try {
	await session.prompt(prompt);
	console.log();
} finally {
	unsubscribe();
	session.dispose();
}
