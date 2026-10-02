import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { addTodo, formatTodos, loadTodos, sortTodos } from "./store.ts";

let dir = "";

before(async () => {
	dir = await mkdtemp(join(tmpdir(), "s02-"));
});
after(async () => {
	await rm(dir, { recursive: true, force: true });
});

test("空文件返回空数组", async () => {
	assert.deepEqual(await loadTodos(join(dir, "missing.json")), []);
});

test("addTodo 自增 id 并落盘", async () => {
	const file = join(dir, ".todos.json");
	const a = await addTodo(file, "第一件事");
	const b = await addTodo(file, "第二件事", 1);
	assert.equal(a.id, 1);
	assert.equal(b.id, 2);
	assert.equal((await loadTodos(file)).length, 2);
});

test("优先级被夹在 1..5", async () => {
	const file = join(dir, "clamp.json");
	assert.equal((await addTodo(file, "低", 0)).priority, 1);
	assert.equal((await addTodo(file, "高", 99)).priority, 5);
});

test("按优先级排序，再按 id", () => {
	const todos = [
		{ id: 3, task: "c", priority: 1, done: false, createdAt: "" },
		{ id: 1, task: "a", priority: 3, done: false, createdAt: "" },
		{ id: 2, task: "b", priority: 1, done: false, createdAt: "" },
	];
	assert.deepEqual(
		sortTodos(todos).map((t) => t.id),
		[2, 3, 1],
	);
});

test("并行调用不丢数据（pi 会并行执行兄弟工具）", async () => {
	const file = join(dir, "parallel.json");
	await Promise.all(Array.from({ length: 20 }, (_, i) => addTodo(file, `task-${i}`)));
	const todos = await loadTodos(file);
	assert.equal(todos.length, 20);
	assert.equal(new Set(todos.map((t) => t.id)).size, 20);
});

test("并行 add × load 不会读到半截 JSON", async () => {
	const file = join(dir, "mixed.json");
	await Promise.all(
		Array.from({ length: 50 }, (_, i) =>
			i % 2 === 0 ? addTodo(file, `w-${i}`) : loadTodos(file),
		),
	);
	assert.equal((await loadTodos(file)).length, 25);
});

test("formatTodos 可读", () => {
	assert.equal(formatTodos([]), "(暂无待办)");
	assert.match(formatTodos([{ id: 1, task: "x", priority: 2, done: false, createdAt: "" }]), /#1 P2 x/);
});
