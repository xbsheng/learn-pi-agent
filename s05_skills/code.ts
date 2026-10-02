/**
 * s05: Skill 按需加载 — 用到时再加载
 *
 * 把 release-notes 这个 skill 注入会话。system prompt 里只会多出 name + description；
 * 模型判断任务命中后，才会用 read 去读 SKILL.md 全文。
 *
 * 运行：
 *   npm run s05
 *   npm run s05 -- "帮我生成这个项目的 release notes"
 */

import { resolve } from "node:path";
import {
	createAgentSession,
	DefaultResourceLoader,
	getAgentDir,
	SessionManager,
	type Skill,
} from "@earendil-works/pi-coding-agent";

const baseDir = resolve(import.meta.dirname, "skills/release-notes");

const releaseNotes: Skill = {
	name: "release-notes",
	description:
		"根据 git 历史生成分类清晰的 release notes。当用户要求生成发布说明、changelog、更新日志或版本记录时使用。",
	filePath: resolve(baseDir, "SKILL.md"),
	baseDir,
	source: "custom",
};

const loader = new DefaultResourceLoader({
	cwd: process.cwd(),
	agentDir: getAgentDir(),
	skillsOverride: (current) => ({
		skills: [...current.skills, releaseNotes],
		diagnostics: current.diagnostics,
	}),
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

const prompt = process.argv.slice(2).join(" ") || "帮我生成这个项目最近的 release notes";

try {
	await session.prompt(prompt);
	console.log();
} finally {
	unsubscribe();
	session.dispose();
}
