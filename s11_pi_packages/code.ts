/**
 * s11: Pi Package — 把扩展、技能、模板打包成一个可分享的单元
 *
 * 加载 pi-example-bundle 这个包，打印它贡献了哪些资源。
 * 不需要 LLM：只验证资源被发现、扩展被加载。
 *
 * Load the pi-example-bundle package and print the resources it contributes.
 * No LLM needed: it only verifies that resources are discovered and the extension is loaded.
 *
 * 运行 / Run:
 *   npm run s11
 */

import { resolve } from "node:path";
import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";

const pkg = resolve(import.meta.dirname, "pi-example-bundle");

// 本地加载：等价于把包内三类资源目录加进发现路径。
// 真实安装用 `pi install ./pi-example-bundle`，pi 会读 package.json 的 pi 清单。
// Local loading: equivalent to adding the bundle's three resource dirs to the discovery paths.
// A real install uses `pi install ./pi-example-bundle`; pi reads the pi manifest from package.json.
const loader = new DefaultResourceLoader({
	cwd: process.cwd(),
	agentDir: getAgentDir(),
	// 关掉默认发现，只看这个包贡献了什么。
	// Turn off default discovery; look only at what this bundle contributes.
	noExtensions: true,
	noSkills: true,
	noPromptTemplates: true,
	additionalExtensionPaths: [resolve(pkg, "extensions/hello.ts")],
	additionalSkillPaths: [resolve(pkg, "skills")],
	additionalPromptTemplatePaths: [resolve(pkg, "prompts")],
});
await loader.reload();

const extensions = loader.getExtensions().extensions;
const skills = loader.getSkills().skills;
const prompts = loader.getPrompts().prompts;

for (const err of loader.getExtensions().errors) {
	console.error(`扩展加载失败 / extension failed：${err.path} — ${err.error}`);
}

console.log(`包路径 / package path：${pkg}\n`);
console.log(`扩展 / extensions（${extensions.length}）：`);
for (const ext of extensions) console.log(`  - ${ext.path}`);

console.log(`\n技能 / skills（${skills.length}）：`);
for (const skill of skills) console.log(`  - ${skill.name}  ${skill.description.slice(0, 40)}`);

console.log(`\n提示词模板 / prompt templates（${prompts.length}）：`);
for (const prompt of prompts) console.log(`  - /${prompt.name}  ${prompt.description}`);

// 建一个会话来确认包内扩展真的注册了工具。
// Create a session to confirm the packaged extension really registered its tool.
const { session } = await createAgentSession({
	resourceLoader: loader,
	sessionManager: SessionManager.inMemory(),
});
const toolNames = session.agent.state.tools.map((t) => t.name);
console.log(`\n会话可用工具包含 pkg_time / session tools include pkg_time：${toolNames.includes("pkg_time")}`);
session.dispose();

console.log("\n安装与分享 / install and share：");
console.log("  pi install ./s11_pi_packages/pi-example-bundle      # 本地目录 / local dir");
console.log("  pi install git:github.com/you/pi-example-bundle@v1  # git");
console.log("  pi install npm:pi-example-bundle@0.1.0              # npm");
