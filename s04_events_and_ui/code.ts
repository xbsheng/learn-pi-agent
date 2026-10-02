/**
 * s04: 事件与钩子 — 观察 + 干预
 *
 * 观察：session.subscribe() 打印每次 turn 和工具执行。
 * 干预：truncate.ts 在 tool_result 里截断过长的 bash 输出。
 *
 * 运行：
 *   npm run s04
 *   npm run s04 -- "只执行 `seq 1 20000`，不要加管道，然后告诉我最大的数"
 */

import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";
import truncateToolResults from "./truncate.ts";

const loader = new DefaultResourceLoader({
	cwd: process.cwd(),
	agentDir: getAgentDir(),
	extensionFactories: [truncateToolResults],
});
await loader.reload();

const { session } = await createAgentSession({
	resourceLoader: loader,
	sessionManager: SessionManager.inMemory(),
});

let turn = 0;
const unsubscribe = session.subscribe((event) => {
	switch (event.type) {
		case "turn_start":
			turn += 1;
			console.error(`\n── turn ${turn} ──`);
			break;
		case "tool_execution_start":
			console.error(`  [tool→] ${event.toolName}`);
			break;
		case "tool_execution_end":
			console.error(`  [tool←] ${event.toolName} ${event.isError ? "ERROR" : "ok"}`);
			break;
		case "turn_end":
			console.error(`  [turn] ${event.toolResults.length} 个工具结果`);
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
	"只执行这一条 bash 命令，不要加管道、重定向、head、tail：seq 1 20000。执行完告诉我输出里最大的数是多少";

try {
	await session.prompt(prompt);
	console.log();
} finally {
	unsubscribe();
	session.dispose();
}
