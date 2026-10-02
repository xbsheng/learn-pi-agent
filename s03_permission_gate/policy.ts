/**
 * 权限策略 —— 纯函数，不依赖 pi，方便单测。
 *
 * 三档：allow（直接放行）、ask（需要用户确认）、block（直接拦截）。
 * ponytail: 基于正则的启发式，绕过方式存在（编码、管道拆分）。
 *           要更强隔离就上沙箱/容器，见 pi docs/containerization.md。
 */

export type Risk = "allow" | "ask" | "block";

export interface Assessment {
	risk: Risk;
	reason?: string;
}

const BLOCK: Array<[RegExp, string]> = [
	[/\brm\s+(-[a-z]*[rf][a-z]*\s+)*\/(?:\s|$)/i, "删除根目录"],
	[/\brm\s+(-[a-z]*[rf][a-z]*\s+)*~(?:\/|\s|$)/i, "删除主目录"],
	[/\bsudo\b/, "提权执行"],
	[/\b(shutdown|reboot|halt|poweroff)\b/i, "关机/重启"],
	[/>\s*\/dev\/(sd|nvme|disk|hd)/i, "直接写块设备"],
	[/\bof=\/dev\/(sd|nvme|disk|hd)/i, "直接写块设备"],
	[/\bmkfs(\.\w+)?\b/, "格式化文件系统"],
	[/:\s*\(\s*\)\s*\{.*\}\s*;\s*:/, "fork 炸弹"],
	[/\bcurl\b[^|]*\|\s*(ba)?sh\b/i, "管道执行远程脚本"],
];

const ASK: Array<[RegExp, string]> = [
	[/\brm\b/, "删除文件"],
	[/\bmv\b/, "移动/覆盖文件"],
	[/\bdd\b/, "底层写入"],
	[/\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|push\b.*--force)/i, "破坏 git 历史"],
	[/\b(chmod|chown)\b/, "修改权限/属主"],
	[/\bkill(all)?\b/, "结束进程"],
	[/\b(npm|pnpm|yarn)\s+(publish|unpublish)\b/, "发布包"],
	[/\btruncate\b|\bshred\b/, "销毁文件内容"],
];

function match(rules: Array<[RegExp, string]>, command: string): string | undefined {
	return rules.find(([re]) => re.test(command))?.[1];
}

export function assessBash(command: string): Assessment {
	const blocked = match(BLOCK, command);
	if (blocked) return { risk: "block", reason: blocked };
	const ask = match(ASK, command);
	if (ask) return { risk: "ask", reason: ask };
	return { risk: "allow" };
}
