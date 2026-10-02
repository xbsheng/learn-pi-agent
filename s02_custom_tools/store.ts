/**
 * 待办存储 —— 与 LLM 无关的纯逻辑，方便单测。
 * 数据落在当前目录的 .todos.json。
 */

import { readFile, rename, writeFile } from "node:fs/promises";

export interface Todo {
	id: number;
	task: string;
	priority: number;
	done: boolean;
	createdAt: string;
}

// pi 默认并行执行同一条 assistant 消息里的多个工具调用，
// 所以 read-modify-write 必须串行化，否则两次 todo_add 会互相覆盖。
// ponytail: 进程内全局锁；跨进程或高吞吐场景换成按文件的锁。
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
	const run = queue.then(fn, fn);
	queue = run.catch(() => {});
	return run;
}

// 未加锁的读，供持锁的写路径复用（避免重入死锁）。
async function readTodos(file: string): Promise<Todo[]> {
	try {
		const raw = await readFile(file, "utf8");
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}
}

// 先写临时文件再 rename，同目录 rename 是原子的，崩溃不会留下半截 JSON。
async function writeTodosAtomic(file: string, todos: Todo[]): Promise<void> {
	const tmp = `${file}.${process.pid}.tmp`;
	await writeFile(tmp, `${JSON.stringify(todos, null, 2)}\n`, "utf8");
	await rename(tmp, file);
}

// 读也走锁：pi 会并行执行兄弟工具调用，add × list 同轮时不能读到写了一半的文件。
export function loadTodos(file: string): Promise<Todo[]> {
	return serialize(() => readTodos(file));
}

export function addTodo(file: string, task: string, priority = 3): Promise<Todo> {
	return serialize(async () => {
		const todos = await readTodos(file);
		const maxId = todos.reduce((max, t) => (Number.isFinite(t.id) ? Math.max(max, t.id) : max), 0);
		const todo: Todo = {
			id: maxId + 1,
			task,
			priority: Math.min(5, Math.max(1, Math.round(priority))),
			done: false,
			createdAt: new Date().toISOString(),
		};
		todos.push(todo);
		await writeTodosAtomic(file, todos);
		return todo;
	});
}

export function sortTodos(todos: Todo[]): Todo[] {
	return [...todos].sort((a, b) => a.priority - b.priority || a.id - b.id);
}

export function formatTodos(todos: Todo[]): string {
	if (todos.length === 0) return "(暂无待办)";
	return sortTodos(todos)
		.map((t) => `${t.done ? "[x]" : "[ ]"} #${t.id} P${t.priority} ${t.task}`)
		.join("\n");
}
