# s04: 事件与钩子 — 挂在循环上，不写进循环里

[s03](../s03_permission_gate/) → `s04` → [s05](../s05_skills/) → ...
> *"挂在循环上，不写进循环里"* — 观察用事件，干预用钩子，主循环永远不改。
>
> **Harness 层**：生命周期 — 让 harness 可观测、可介入。

---

## 问题

s03 的权限闸门已经挂上了 `tool_call`。但 pi 的循环里还有很多值得关注的时刻：

- 模型这一轮调了哪些工具？哪个最慢？总共花了多少 token、多少钱？
- 工具返回了一大坨日志，把上下文顶爆了，能不能在喂回模型之前压缩一下？
- 用户发来的 prompt 里有敏感词，能不能先处理再给模型？
- 每次会话开始，能不能自动注入一段团队规范？

这些都不应该靠改 pi 源码实现，也不应该靠 system prompt 求模型配合。它们都是**生命周期插口**。

## 解决方案

pi 把循环的每个相位都暴露成事件。你只订阅，不 fork：

```typescript
// 观察：session.subscribe() 拿到全部 AgentSessionEvent
session.subscribe((event) => {
  if (event.type === "tool_execution_start") console.error(`[tool] ${event.toolName}`);
  if (event.type === "turn_end") console.error(`[turn] ${event.toolResults.length} 个结果`);
});

// 干预：扩展里 pi.on() 拿到可修改/可阻止的事件
pi.on("tool_result", async (event) => {
  if (isBashToolResult(event)) {
    return { content: truncate(event.content, 4000) }; // 修改结果，不打断循环
  }
});
```

## 工作原理

事件分两类，职责不同：

| | 观察类 `session.subscribe()` | 干预类 `pi.on()` |
|---|---|---|
| 能拿到 | 循环的实时状态 | 循环的决策点 |
| 能否改变行为 | 不能 | 能（阻止、修改、注入） |
| 典型用途 | 日志、UI、计量、进度条 | 权限、压缩、改写、注入上下文 |

完整的生命周期（对照 s01 的那张图）：

```
session_start
  └─► 用户 prompt
        ├─► input                     ← 可拦截/改写用户输入
        ├─► before_agent_start        ← 可注入消息、改 system prompt
        ├─► agent_start
        ├─► turn_start
        │     ├─► context             ← 可修改即将发给模型的 messages
        │     ├─► before_provider_request   ← 可替换请求体
        │     ├─► after_provider_response   ← 记录状态码/响应头
        │     ├─► message_start / message_update / message_end
        │     ├─► tool_execution_start
        │     ├─► tool_call           ← 可阻止/改参（s03）
        │     ├─► tool_execution_update
        │     ├─► tool_result         ← 可修改结果（本章）
        │     ├─► tool_execution_end
        │     └─► turn_end
        ├─► agent_end
        └─► agent_settled
```

**关键区分**：`tool_execution_*` 是观察类，只是通知；`tool_call` / `tool_result` 是干预类，返回值有语义。`tool_result` 的处理器像中间件一样链式执行，每个都能看到上一个的修改，返回 `{ content }`、`{ details }`、`{ isError }` 部分补丁。

### 本章的干预：上下文压缩的第一道防线

工具输出是上下文爆炸的头号来源。`npm test` 失败能吐几万行堆栈，模型只在末尾需要那几十行。在 `tool_result` 里截断，比其他任何压缩都便宜：

```typescript
pi.on("tool_result", async (event) => {
  if (!isBashToolResult(event)) return;
  const text = event.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  if (text.length <= MAX_CHARS) return;
  const half = Math.floor(MAX_CHARS / 2);
  return {
    content: [
      { type: "text", text: `${text.slice(0, half)}\n…（已省略 ${text.length - MAX_CHARS} 字符）…\n${text.slice(-half)}` },
    ],
    isError: event.isError,
  };
});
```

> **保留头尾，而不是只留头。** 日志的价值往往在开头（错在哪）和结尾（最终的失败原因）；只 `slice(0, N)` 会把最关键的尾部丢掉。这是压缩策略的细节，却是能不能救回答案的分水岭。

## 试一下

```bash
npm run s04
npm run s04 -- "只执行这一条 bash 命令，不要加管道、重定向、head、tail：seq 1 20000。然后告诉我输出里最大的数"
```

观察两件事：

1. 终端里的 `[turn]`、`[tool]` 追踪（观察）。
2. `seq 1 20000` 的输出被截断后才回到模型，但它仍能回答（干预）。没有这段钩子，两万行会直接进上下文。

## 本章要点

- 观察用 `session.subscribe()`，干预用 `pi.on()`，两者都不动主循环。
- `tool_result` 是最好的轻量上下文压缩点。
- 其他有用的插口：`input`（改写用户输入）、`before_agent_start`（注入规范）、`context`（改 messages）、`before_provider_request`（换请求体）。
- 干预类事件能返回 `block` 或补丁；观察类事件只读。

## 下一章

事件的第二种用法：让 harness 自己带知识。**s05：Skill 按需加载**。
