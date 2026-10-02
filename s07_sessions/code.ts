/**
 * s07: 会话与分支 — 持久化 + 恢复 + 会话树
 *
 * 1. 新建持久会话，让模型记住一个暗号，然后关闭。
 * 2. 恢复最近的会话，问它暗号 —— 答对说明记忆来自磁盘。
 * 3. 打印会话列表与当前分支结构。
 *
 * 运行：
 *   npm run s07
 */

import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();

function printStream(session: AgentSession) {
	return session.subscribe((event) => {
		if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
			process.stdout.write(event.assistantMessageEvent.delta);
		}
	});
}

// ── 1. 新建持久会话 ──────────────────────────────────────────────
console.log("[1] 新建持久会话，写入一条需要记住的信息\n");
const sm1 = SessionManager.create(cwd);
const { session: s1 } = await createAgentSession({ sessionManager: sm1 });
const unsub1 = printStream(s1);
await s1.prompt("请记住暗号：紫色犀牛。只回复'记住了'。");
console.log(`\n    会话文件：${s1.sessionFile}`);
unsub1();
s1.dispose(); // 关闭会话，模拟进程退出

// ── 2. 恢复最近的会话 ────────────────────────────────────────────
console.log("\n[2] 用 continueRecent 重新打开，验证记忆来自磁盘\n");
const sm2 = SessionManager.continueRecent(cwd);
const { session: s2 } = await createAgentSession({ sessionManager: sm2 });
console.log(`    恢复了 ${s2.agent.state.messages.length} 条历史消息`);
const unsub2 = printStream(s2);
await s2.prompt("暗号是什么？只回答暗号本身。");
console.log();
unsub2();

// ── 3. 会话树 ────────────────────────────────────────────────────
const branch = sm2.getBranch();
const leaf = sm2.getLeafEntry();
console.log(`\n[3] 当前分支：${branch.length} 个条目，叶子 = ${leaf?.id}`);

const sessions = await SessionManager.list(cwd);
console.log(`\n    本项目共有 ${sessions.length} 个会话，最近 3 个：`);
for (const info of sessions.slice(0, 3)) {
	console.log(`    - ${info.modified.toISOString()}  ${info.messageCount} 条消息  ${info.firstMessage.slice(0, 30)}`);
}

s2.dispose();
console.log("\n提示：会话是 JSONL + id/parentId 的树，sm.branch(entryId) 即可从任意节点分叉。");
