/**
 * s05: Skill 按需加载 — 用到时再加载
 *
 * 把 release-notes 这个 skill 注入会话。system prompt 里只会多出 name + description；
 * 模型判断任务命中后，才会用 read 去读 SKILL.md 全文。
 *
 * Inject the release-notes skill into the session. Only name + description enter the
 * system prompt; when the model judges a task hits, it reads the full SKILL.md with read.
 *
 * 运行 / Run:
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

// description 是给模型的路由表：写得越具体，命中越准。
// description is the model's routing table: the more specific, the better the hit rate.
const releaseNotes: Skill = {
	name: "release-notes",
	description:
		"根据 git 历史生成分类清晰的 release notes。当用户要求生成发布说明、changelog、更新日志或版本记录时使用。",
	filePath: resolve(baseDir, "SKILL.md"),
	baseDir,
	source: "custom",
};

// skillsOverride 把 skill 追加进发现结果，等价于放进 .pi/skills/。
// skillsOverride appends the skill to the discovery result, equivalent to putting it in .pi/skills/.
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
	// 命中时会看到 read(SKILL.md) 与 bash(collect.sh)。
	// On a hit you will see read(SKILL.md) and bash(collect.sh).
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
