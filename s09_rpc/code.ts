/**
 * s09: RPC 集成 — 用 JSONL 驱动一个独立的 pi 子进程
 *
 * 这是 pi RPC 协议的最小 Node 客户端：
 *   stdin  发送命令（prompt / steer / abort …）
 *   stdout 接收事件（response / message_update / agent_end …）
 *
 * 严格按 "\n" 切帧（不用 readline：它会把 U+2028/U+2029 也当换行）。
 *
 * 运行：
 *   npm run s09
 *   npm run s09 -- "用 bash 数一数当前目录有多少个 .ts 文件"
 */

import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

const prompt = process.argv.slice(2).join(" ") || "用 bash 数一数当前目录有多少个 .ts 文件";

// --no-session：不落盘，纯一次性任务。去掉它就会持久化。
const child = spawn("pi", ["--mode", "rpc", "--no-session"], {
	stdio: ["pipe", "pipe", "inherit"],
});

function attachJsonlReader(stream: NodeJS.ReadableStream, onLine: (line: string) => void) {
	const decoder = new StringDecoder("utf8");
	let buffer = "";
	stream.on("data", (chunk: Buffer | string) => {
		buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
		for (;;) {
			const newline = buffer.indexOf("\n");
			if (newline === -1) break;
			let line = buffer.slice(0, newline);
			buffer = buffer.slice(newline + 1);
			if (line.endsWith("\r")) line = line.slice(0, -1);
			if (line) onLine(line);
		}
	});
	stream.on("end", () => {
		buffer += decoder.end();
		if (buffer) onLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
	});
}

const done = new Promise<void>((resolve) => {
	attachJsonlReader(child.stdout, (line) => {
		const event = JSON.parse(line);

		switch (event.type) {
			case "response":
				console.error(`[response] ${event.command} success=${event.success}`);
				break;
			case "message_update":
				if (event.assistantMessageEvent.type === "text_delta") {
					process.stdout.write(event.assistantMessageEvent.delta);
				}
				break;
			case "tool_execution_start":
				console.error(`\n[tool] ${event.toolName}`);
				break;
			case "agent_end":
				console.log();
				resolve();
				break;
			default:
				break;
		}
	});
});

// 发一条命令：id 用于把响应和请求对上。
child.stdin.write(JSON.stringify({ id: "req-1", type: "prompt", message: prompt }) + "\n");

// Ctrl+C 时优雅中断。
process.on("SIGINT", () => {
	child.stdin.write(JSON.stringify({ type: "abort" }) + "\n");
});

await done;
child.kill();
