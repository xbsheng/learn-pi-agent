/**
 * 包内扩展：注册一个工具和一个命令。
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function exampleBundle(pi: ExtensionAPI) {
	pi.registerTool({
		name: "pkg_time",
		label: "Package Time",
		description: "返回当前时间的 ISO 字符串。用于演示 pi package 里的自定义工具。",
		parameters: Type.Object({}),
		async execute() {
			return {
				content: [{ type: "text", text: new Date().toISOString() }],
				details: {},
			};
		},
	});

	pi.registerCommand("pkg-hello", {
		description: "演示包内命令",
		handler: async (args, ctx) => {
			ctx.ui.notify(`来自 pi-example-bundle：${args || "hello"}`, "info");
		},
	});
}
