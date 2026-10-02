/**
 * 权限闸门扩展 —— 挂在 tool_call 事件上，拦截任何 bash 调用。
 *
 * 这是一个可以直接放进 ~/.pi/agent/extensions/ 的扩展文件：
 *   pi -e ./s03_permission_gate/permission.ts
 * 也可以像 code.ts 那样用 extensionFactories 内联加载。
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { assessBash } from "./policy.ts";

export default function permissionGate(pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		// 只审查 bash；其他工具各有职责，交给别的扩展。
		if (!isToolCallEventType("bash", event)) return;

		const { risk, reason } = assessBash(event.input.command);

		if (risk === "allow") return;

		if (risk === "block") {
			ctx.ui.notify(`已拦截 bash：${reason}`, "error");
			return { block: true, reason: `权限策略拦截：${reason}`, terminate: true };
		}

		// ask：交互模式问用户；非交互模式默认拒绝（fail-closed）。
		if (!ctx.hasUI) {
			return { block: true, reason: `非交互模式下默认拒绝高风险命令（${reason}）` };
		}
		const ok = await ctx.ui.confirm("确认执行？", `${event.input.command}\n\n风险：${reason}`);
		return ok ? undefined : { block: true, reason: "用户拒绝" };
	});
}
