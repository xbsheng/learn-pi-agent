/**
 * 工具结果截断 —— 挂在 tool_result 上的干预型钩子。
 *
 * 工具输出是上下文膨胀的头号来源。超过 MAX_CHARS 的 bash 输出在这里被截断，
 * 再喂回模型，比事后做上下文压缩便宜得多。
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isBashToolResult } from "@earendil-works/pi-coding-agent";

const MAX_CHARS = 4000;

export default function truncateToolResults(pi: ExtensionAPI) {
	pi.on("tool_result", async (event) => {
		if (!isBashToolResult(event)) return;

		const text = event.content
			.map((block) => (block.type === "text" ? block.text : ""))
			.join("");
		if (text.length <= MAX_CHARS) return;

		const omitted = text.length - MAX_CHARS;
		const half = Math.floor(MAX_CHARS / 2);
		return {
			content: [
				{
					type: "text",
					text: `${text.slice(0, half)}\n…（输出过长，已省略 ${omitted} 个字符）…\n${text.slice(-half)}`,
				},
			],
			isError: event.isError,
		};
	});
}
