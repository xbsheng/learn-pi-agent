[English](README.en.md) | 中文

# s08: 子 Agent — 给子任务一份全新的 messages[]

[s07](../s07_sessions/) → `s08` → [s09](../s09_rpc/) → ...
> *"给子任务一份全新的 messages[]，最终文本作为一条工具结果返回"* — 上下文隔离。
>
> **Harness 层**：委派 — 用上下文预算换取专注度。

---

## 问题

主 agent 在解决一个任务时，常常需要「先做一轮调查，再回来继续」。比如：

- 「统计每个源文件的行数，找出最大的三个」—— 中间要读几十个文件，全是噪音。
- 「调研这个 API 怎么用」—— 中间要搜文档、试命令，只有结论有用。
- 「审查这个模块」—— 中间过程很长，主线程只需要最终结论。

如果这些调查都在主 `messages[]` 里做，会有两个后果：**上下文被中间过程塞满**，而且**主 agent 的注意力被细节带偏**。人类团队不会让所有人共享一个大脑，agent 也一样。

## 解决方案

子 agent 就是**另开一个 `AgentSession`**，给它全新的 `messages[]`、独立的 system prompt、独立的工具集。它跑完，只有最终文本作为一条 `tool_result` 回到主会话。

```typescript
const sub = await createAgentSession({
  sessionManager: SessionManager.inMemory(),        // 全新、隔离
  resourceLoader: subLoader,                        // 独立的 system prompt
  tools: ["read", "grep", "find", "ls"],            // 只读，防止乱改
});

sub.subscribe((event) => { /* 把进度通过 onUpdate 冒泡给主会话 */ });
await sub.prompt(task);
const answer = lastAssistantText(sub.agent.state.messages);
sub.dispose();

return { content: [{ type: "text", text: answer }], details: { ... } };
```

主会话里，它看起来只是一个普通工具调用：

```
主 messages[]:  ... 用户提问 → assistant 调 delegate → tool_result(子 agent 的结论) → assistant 汇总
                                    │
                                    └─ 子 agent 的 messages[]（独立、跑完即弃）
```

## 工作原理

### 为什么隔离有效

| | 主会话 | 子 agent |
|---|---|---|
| `messages[]` | 全程累积 | 全新，跑完丢弃 |
| system prompt | 通用 | 可针对任务定制 |
| 工具集 | 全部 | 可收窄（例如只读） |
| 上下文占用 | 只增加一条 tool_result | 中间过程全部留在自己的上下文里 |

这就是「上下文预算换专注度」：子 agent 烧掉自己的上下文去读 50 个文件，主会话只看到结论。

### 三个实现要点

1. **任务描述要自包含。** 子 agent 看不到主会话的历史，你必须把「要什么、边界在哪、输出什么格式」全部写进 `task` 字符串。
2. **工具集要收窄。** 调查型子任务给只读工具（`read`/`grep`/`find`/`ls`）；需要改代码再给 `edit`/`write`。最小权限原则同样适用于子 agent。
3. **返回结构要干净。** `content` 放结论（喂回主模型），`details` 放元数据（行数、耗时、文件列表），别把中间过程塞回去，否则隔离白做了。

### 和「手写循环」版本的差别

从零实现子 agent，你要自己 new 一个 `messages[]`、跑循环、再把最终文本包成一条工具结果返回。pi 把这件事压缩成一句 **`createAgentSession()`** —— 它就是那个全新的 `messages[]`。

> **注意**：pi 刻意不内置 sub agent，而是把它留给扩展（[examples/extensions/subagent.ts](https://github.com/badlogic/pi-mono)）。这正是「小核心 + 扩展」哲学 —— 你按自己的需要实现委派策略。

## 变更内容

| 组件 | s07 | s08 |
|---|---|---|
| 子任务上下文 | 与主会话共享 | 全新 `messages[]` |
| 中间过程 | 进入主上下文 | 留在子会话，跑完即弃 |
| 工具集 | 全部 | 可收窄（本章只读） |
| 返回 | 全部消息 | 一条 `tool_result`（结论） |
| 循环 | 不变 | 不变 |

## 试一下

```bash
npm run s08
npm run s08 -- "让子 agent 统计 s01 到 s08 各章 code.ts 的行数，你只汇总成一张表"
```

观察主会话的事件流：只有一次 `delegate` 工具调用，然后直接出表。子 agent 读文件、跑命令的过程全部发生在它自己的上下文里，主会话的 `messages` 长度几乎没变。

再试几个，重点对比「委派」和「不委派」：

- `npm run s08 -- "让子 agent 找出本仓库里最大的 3 个 .ts 文件并给出总行数"` —— 子 agent 读很多文件，主会话只多一条结果
- `npm run s08 -- "你自己统计 s01 到 s08 各章 code.ts 的行数"`（不委派）—— 同样的活，主会话消息数会明显变多

## 本章要点

- 子 agent = 新 `AgentSession` + 全新 `messages[]` + 独立工具集。
- 任务描述必须自包含；返回只放结论。
- 调查型子任务用只读工具。
- 这是「上下文预算换专注度」，也是并行化子任务的基础。

## 下一章

子 agent 解决的是「同一进程内的隔离」。要让**别的语言、别的进程**驱动 pi，需要 RPC。**s09：RPC 集成**。