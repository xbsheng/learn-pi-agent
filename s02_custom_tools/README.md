# s02: 自定义工具 — 加一个能力，只加一个 handler

[s01](../s01_agent_session/) → `s02` → [s03](../s03_permission_gate/) → ...
> *"加一个能力，只加一个 handler"* — 循环不动，新工具注册进工具池就行。
>
> **Harness 层**：行动 — 给模型一双手。

---

## 问题

pi 默认给模型四个工具：`read`、`write`、`edit`、`bash`。

这四个已经很通用，但每个领域的 harness 都需要自己的动作：查询内部工单、调用业务 API、操作数据库、写入结构化状态……这些不是「读文件」和「跑命令」能优雅表达的，而且你也不希望模型每次都用 `bash` 拼一个 `curl`。

## 解决方案

`defineTool()` 定义工具的**名字、描述、参数 schema、执行函数**。pi 负责把它转成模型能看到的工具定义，并在模型调用时执行它。

```typescript
import { Type } from "typebox";
import { createAgentSession, defineTool } from "@earendil-works/pi-coding-agent";

const todoAdd = defineTool({
  name: "todo_add",
  label: "Add Todo",
  description: "把一条待办写入当前目录的 .todos.json。当用户要求记录任务时使用。",
  parameters: Type.Object({
    task: Type.String({ description: "待办内容" }),
    priority: Type.Optional(Type.Number({ description: "优先级 1-5，默认 3" })),
  }),
  execute: async (_toolCallId, params) => {
    // ... 真正干活
    return {
      content: [{ type: "text", text: `已添加：#${id} ${params.task}` }],
      details: { id },
    };
  },
});

const { session } = await createAgentSession({
  customTools: [todoAdd, todoList],
});
```

就这些。**主循环一行都不用改** —— 这正是 learn-claude-code s02 所说的「循环不用动，新工具注册进 dispatch map 就行」。在 pi 里，这个 dispatch map 由内核维护，`customTools` 就是注册入口。

## 工作原理

`defineTool()` 的每个字段都有明确职责：

| 字段 | 给谁看 | 作用 |
|---|---|---|
| `name` | 模型 | 调用时用的标识，必须唯一 |
| `description` | 模型 | **决定模型什么时候用它**。写得越具体，命中越准 |
| `parameters` | 模型 + 校验 | typebox schema，自动生成 JSON Schema 并在调用前校验 |
| `execute` | 内核 | 真正执行的函数，返回 tool result |
| `label` | 人类 | TUI 里显示的名字 |

`execute` 的签名：

```typescript
async execute(toolCallId, params, signal, onUpdate, ctx) => ToolResult
```

- `params`：已按 schema 校验并类型化的参数。
- `signal`：`AbortSignal`。用户按 Esc 时触发，长任务要检查它。
- `onUpdate`：流式进度回调，模型还没看到结果，用户可以先看到。
- `ctx`：扩展上下文（cwd、ui、sessionManager 等）。

返回值：

```typescript
{
  content: [{ type: "text", text: "给模型看的结果" }],
  details: { any: "给 UI/调用方看的结构化数据，不进入模型上下文" },
  isError?: boolean,
}
```

> **`content` vs `details`**：`content` 会作为 `tool_result` 喂回模型；`details` 只存在于本地，用于渲染 UI 或给 SDK 消费。把冗长日志放 `details`，把结论放 `content`，能省上下文。

### 一个必须知道的坑：工具是并行执行的

pi 默认**并发执行同一条 assistant 消息里的多个工具调用**（先串行 preflight，再并发执行）。这对只读工具是加速，对 read-modify-write 是灾难：模型一次要求添加三条待办时，两个 `todo_add` 会同时读到空文件、各写各的，后写覆盖先写。

本章的 `store.ts` 用一条 promise 链把写操作串行化：

```typescript
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}
```

这就是 harness 工程师要操心的事：**模型只管发起动作，并发安全是工具实现的责任。** 配套单测里有一条 `并行调用不丢数据` 专门守住这个回归。

还有两个同源的细节，本章代码一并处理了：

- **读也要进锁。** `todo_list` 和 `todo_add` 同轮出现时，读路径若不加锁会读到 `writeFile` 写了一半的文件（s06 的 `/review` 模板真的把这个问题扫出来了）。
- **写要原子。** 先写临时文件再 `rename`，进程在写入中途被杀也不会留下半截 JSON。

## 试一下

```bash
npm run s02
npm run s02 -- "把'复习权限闸门'、'写 s03 代码'、'跑步'加入待办，优先级分别是 1、2、5，然后列出来"
cat .todos.json    # 看工具真的写了盘
npm test           # 含并行写入的回归测试
```

你会看到模型自动决定调用 `todo_add` 三次、`todo_list` 一次。它是自己看 `description` 选的，代码里没有任何 if-else 路由。

## 本章要点

- 加一个工具 = 加一个 `defineTool()`，注册进 `customTools`，循环不动。
- `description` 是给模型的路由表，比代码重要。
- `signal` 要检查，否则 Esc 取消不掉你的长任务。
- 用 `details` 携带不喂给模型的结构化数据。
- 同一条消息里的多个工具调用会**并行执行**，有副作用的工具必须自己做并发控制。

## 下一章

工具能被调用了，但任何工具都能被调用 —— 包括 `bash` 里的 `rm -rf`。**s03：权限闸门** 给动作划边界。
