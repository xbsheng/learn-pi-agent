# s07: 会话与分支 — 上下文会满，要能存、能分叉

[s06](../s06_prompt_templates/) → `s07` → [s08](../s08_subagents/) → ...
> *"上下文会满，要能存、能分叉"* — 会话是树，不是一条直线。
>
> **Harness 层**：上下文管理 — 让对话跨越单次进程、跨越单条路径。

---

## 问题

前六章所有会话都用 `SessionManager.inMemory()`，进程退出就灰飞烟灭。真实使用里有三个绕不开的需求：

1. **持久化**：今天让 agent 摸清了代码库，明天想接着聊，不想重新解释一遍。
2. **分叉**：让 agent 试方案 A，发现走不通，想回到分叉点试方案 B，而不是在失败的历史上继续。
3. **压缩**：聊得够久，上下文必然超限。需要一个不丢关键信息的瘦身办法。

## 解决方案

`SessionManager` 提供三种打开方式，加上一棵会话树：

```typescript
// 新会话，落盘
const sm = SessionManager.create(process.cwd());
const { session } = await createAgentSession({ sessionManager: sm });

// 恢复本项目最近的会话
const sm2 = SessionManager.continueRecent(process.cwd());

// 打开指定文件
const sm3 = SessionManager.open("/path/to/session.jsonl");
```

会话在磁盘上是 JSONL，每条记录带 `id` / `parentId`，构成一棵树：

```
        ┌─ 用户: "用方案 A"  ─ assistant ─ tool ─ ...
root ───┤
        └─ 用户: "用方案 B"  ─ assistant ─ ...      ← 从同一个点分叉
```

`sm.getBranch()` 是根到当前叶子的分支，`sm.getLeafEntry()` 是当前叶子，`sm.getTree()` 是整棵树。分支就是移动叶子：`sm.branch(entryId)`。

## 工作原理

### 持久化：JSONL + 树

每次 `prompt()` 后，pi 把新条目追加到会话文件。条目类型包括用户消息、assistant 消息、工具结果、压缩摘要、自定义条目（`pi.appendEntry()`）等。因为用 `parentId` 串起来，恢复时按当前叶子回溯即可得到「这条分支上的完整上下文」，而不是把整个文件都塞进模型。

这就是为什么 pi 的 `/resume`、`/fork`、`/clone` 能工作：**会话文件本身就是数据结构，不是一段线性文本。**

### 压缩：自动 + 手动

pi 会在接近上下文上限时自动压缩（可在 settings 里配置）。SDK 里也可以手动触发：

```typescript
await session.compact(); // 生成历史摘要，替换掉早前的长消息
await session.compact("重点保留所有 API 签名和未解决的 TODO");
```

压缩不是简单的截断，而是让模型对较早历史生成结构化摘要，保留目标、决策、未完成事项。s04 的 `tool_result` 截断是第一道防线（在进入上下文前就瘦身），`compact()` 是最后一道（历史实在装不下时）。

### 分支：在树上移动

```typescript
const entries = sm.getEntries();
const leaf = sm.getLeafEntry();
const branch = sm.getBranch();        // 当前分支
sm.branch(entries[3].id);             // 把叶子移回第 3 条，之后的新消息从这里分叉
```

`AgentSessionRuntime` 还提供更高层的 `fork(entryId)` / `newSession()` / `switchSession()`，交互模式里的 `/fork`、`/new`、`/resume` 就是它们。

## 试一下

```bash
npm run s07
```

脚本做两件事：

1. 新建持久会话，让模型记住一个暗号，打印会话文件路径，然后**关闭会话**。
2. 用 `continueRecent()` 重新打开，问它暗号是什么 —— 如果答对，说明记忆真的来自磁盘，不是内存。
3. 最后打印会话列表和当前分支的条目数。

```bash
ls ~/.pi/agent/sessions/    # 看落盘的 JSONL
```

## 本章要点

- `SessionManager.create` / `continueRecent` / `open` 三种入口。
- 会话是 `id`/`parentId` 的树，不是线性日志，这是分支的基础。
- `compact()` 生成历史摘要；s04 的结果截断是更便宜的前置手段。
- 持久化让 harness 有「长期记忆」，子 agent（s08）和 RPC（s09）都建立在这上面。

## 下一章

有了「能新建会话」的能力，就可以把一个子任务丢进一个全新的 `messages[]` 里。**s08：子 Agent**。
