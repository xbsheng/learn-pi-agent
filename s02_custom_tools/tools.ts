/**
 * 待办工具 —— 从 s02 抽出，供 s02 和 s12 共用。
 */

import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { addTodo, formatTodos, loadTodos } from "./store.ts";

export function createTodoTools(file: string) {
	const todoAdd = defineTool({
		name: "todo_add",
		label: "Add Todo",
		description: "把一条待办写入 .todos.json。当用户要求记录任务、待办或提醒时使用。",
		parameters: Type.Object({
			task: Type.String({ description: "待办内容" }),
			priority: Type.Optional(Type.Number({ description: "优先级 1-5，1 最高，默认 3" })),
		}),
		async execute(_toolCallId, params, _signal, onUpdate) {
			onUpdate?.({ content: [{ type: "text", text: `正在写入：${params.task}` }] });
			const todo = await addTodo(file, params.task, params.priority ?? 3);
			return {
				content: [{ type: "text", text: `已添加 #${todo.id}（P${todo.priority}）：${todo.task}` }],
				details: todo,
			};
		},
	});

	const todoList = defineTool({
		name: "todo_list",
		label: "List Todos",
		description: "列出 .todos.json 中的所有待办，按优先级排序。",
		parameters: Type.Object({}),
		async execute() {
			const todos = await loadTodos(file);
			return {
				content: [{ type: "text", text: formatTodos(todos) }],
				details: { count: todos.length },
			};
		},
	});

	return [todoAdd, todoList];
}
