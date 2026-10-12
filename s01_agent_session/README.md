[English](README.en.md) | 中文

# s01: AgentSession — pi 已经转着循环

`s01` → [s02](../s02_custom_tools/) → s03 → s04 → ... → s12
> *"pi 已经转着循环，你只需要接上"* — 一个 `prompt()` = 一个完整的 agent loop。
>
> **Harness 层**：循环 — 模型与真实世界的第一道连接。

---

## 问题

如果从零手写一个 agent，第一件事就是一个 `while True`：判断模型响应里有没有 `tool_use` 块，有就执行工具、把结果追加回消息，再回到模型。

但如果你用的是 pi，这个循环已经在本地实现好了，而且处理了一堆你还没想到的事：多轮流式、工具并行执行、错误重试、上下文自动压缩、会话持久化、中断恢复。

再写一遍是浪费。这一章要看清的是：**pi 把这个循环的哪个入口交给你，以及它内部到底在循环什么。**

## 解决方案

一个 `createAgentSession()` + 一次 `session.prompt()`。

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

try {
  await session.prompt(process.argv.slice(2).join(" ") || "用一句话介绍当前目录是什么项目");
  console.log();
} finally {
  session.dispose();
}
```

`prompt()` 直到整个 run 结束（包括所有工具调用和重试）才 resolve。你在 `subscribe` 里看到的就是循环的每一次呼吸。

## 工作原理

pi 内部的循环（简化）：

```
prompt(text)
  │
  ├─► 组装 messages + tools + system prompt
  │
  └─► while True:
        response = LLM(messages, tools)
        messages.append(response)

        有 tool_use 吗？
          ├─ 没有 → 结束，prompt() resolve
          └─ 有   → tool_call 钩子 → 执行工具 → 追加 tool_result
                     └──────────► 回到 LLM
```

如果你手写过这个循环，可以逐块对照「自己实现」和「pi 内置」：

| 自己手写循环 | pi（内置） | 你在哪介入 |
|---|---|---|
| `client.messages.create(...)` | 内核帮调 LLM | `before_provider_request` 事件 |
| 检查 `tool_use` block | 内核判断 | 无需介入 |
| `TOOL_HANDLERS[name](**input)` | 内置 4 个工具 + 你的自定义工具 | `defineTool()` / `pi.registerTool()` |
| 直接执行，无检查 | 直接执行，默认信任模型 | `tool_call` 钩子（s03） |
| `messages.append(...)` | `AgentSession` 状态 | `context` 事件 / `session.state.messages` |
| — | 会话持久化、压缩、重试 | `SessionManager`（s07） |

> **关键认知**：pi 没有把循环藏起来。它通过**事件**（观察）和**钩子**（干预）把循环的每个相位都暴露给你。你在后面章节学到的一切，都是挂在这条循环上的。

事件流的生命周期（记住这张图，后面每章都在用它）：

```
session_start
  └─► 用户 prompt
        ├─► agent_start
        ├─► turn_start
        │     ├─► message_start / message_update / message_end
        │     ├─► tool_execution_start → tool_call → tool_result → tool_execution_end
        │     └─► turn_end
        ├─► agent_end
        └─► agent_settled   ← 重试、压缩、follow-up 都清空后的最终静止点
```

## 变更内容

| 组件 | 之前（裸模型） | s01（pi） |
|---|---|---|
| Agent 循环 | 自己写 `while` + 判断 `stop_reason` | `createAgentSession()` 内置 |
| 工具 | 自己实现并 dispatch | 内置 `read` / `write` / `edit` / `bash` |
| 消息状态 | 手动维护 `messages[]` | `AgentSession` 维护 |
| 持久化 | 无 | `SessionManager`（s07 展开） |
| 循环 | — | 不变，后面每一章都不改 |

## 试一下

```bash
npm run s01
npm run s01 -- "列出当前目录，并挑一个文件用一句话说明它做什么"
npm run s01 -- "创建 hello.txt，写入 'hi from pi'，再读回来确认"
```

第三个命令能让你亲眼看到循环转了至少两轮：`write` 一次、`read` 一次，中间还有模型的推理。

再试几个，每次都留意 `subscribe` 里的事件顺序：

- `npm run s01 -- "找出所有提到 TODO 的文件并总结"`
- `npm run s01 -- "把 README 的第一段翻译成英文"`

模型是先 `read` 还是先 `bash`？一个 prompt 里它一共转了几轮？

## 本章要点

- `createAgentSession()` 给你一个已经会循环的 `AgentSession`。
- 用 `subscribe()` 观察循环，用内置工具和自定义工具给模型一双手。
- `SessionManager.inMemory()` 让会话不落盘，适合脚本和测试；s07 会换成持久化。

## 下一章

只有一个内置工具集是不够的。我们把「加一个工具」的成本压到最小 —— **s02：自定义工具**。