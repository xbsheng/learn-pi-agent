[English](README.en.md) | 中文

# s12: 完整 Harness — 多种机制，一个会话

[s11](../s11_pi_packages/) → `s12`
> *"多种机制，一个会话"* — 所有扩展点最终都汇入同一条循环。
>
> **Harness 层**：集成 — 把零件装成一台机器。

---

## 问题

前面十一章各自演示了一个机制，但真实产品不会只用其中一个。一个可用的 coding agent harness 通常同时需要：

- 自己的工具（业务动作）
- 权限闸门（安全边界）
- 结果截断（上下文预算）
- 按需技能（领域知识）
- 提示词模板（用户流程）
- 子 agent（任务隔离）

它们会不会互相冲突？加载顺序有没有讲究？**这一章把它们装进同一个 `AgentSession`，证明 pi 的扩展点是正交的。**

## 解决方案

一个会话，六个机制：

```typescript
const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  extensionFactories: [permissionGate, truncateToolResults],        // s03 + s04
  additionalSkillPaths: ["../s05_skills/skills"],                    // s05
  additionalPromptTemplatePaths: ["../s06_prompt_templates/prompts"],// s06
});
await loader.reload();

const { session } = await createAgentSession({
  resourceLoader: loader,
  customTools: [...createTodoTools(TODOS_FILE), delegate],           // s02 + s08
  sessionManager: SessionManager.inMemory(),
});
```

没有一行改动 pi 的核心，没有一处配置互相打架。

## 工作原理

### 装配图

```
                        ┌─────────────────────────────────────────┐
   prompt ──► /review ──►  prompt 模板展开（s06）                  │
             │           └─────────────────────────────────────────┘
             ▼
        AgentSession ──► system prompt 里只有 skill 的 name+desc（s05）
             │
             ▼
        ┌─ while 循环 ─────────────────────────────────────────┐
        │  LLM 决定动作                                         │
        │     │                                                 │
        │     ├─ tool_call  ──► 权限闸门：allow/ask/block（s03） │
        │     │                                                 │
        │     ├─ execute ────► 自定义工具 todo_*（s02）          │
        │     │                delegate ──► 子 AgentSession（s08）│
        │     │                                                 │
        │     └─ tool_result ─► 截断超长输出（s04）              │
        │                                                       │
        │  结果追加，回到 LLM ◄──────────────────────────────────┘
        └───────────────────────────────────────────────────────┘
```

### 各机制的介入点

| 机制 | 章节 | 介入点 | 是否改变循环 |
|---|---|---|---|
| 自定义工具 | s02 | 工具池 | 否 |
| 权限闸门 | s03 | `tool_call` | 否 |
| 结果截断 | s04 | `tool_result` | 否 |
| 技能 | s05 | system prompt + `read` | 否 |
| 提示词模板 | s06 | prompt 发送前 | 否 |
| 子 agent | s08 | 工具执行内部新开会话 | 否 |

**这张表的每一行都是「否」—— 这就是 pi 扩展设计的全部意义。**

### 装配顺序的讲究

- **扩展加载顺序 = 处理顺序。** 多个 `tool_call` / `tool_result` 处理器按加载顺序链式执行。权限闸门应该尽量靠前（早拦截省算力），截断可以靠后（拿到最终结果再裁）。
- **技能与模板只是资源**，谁先加载不影响行为，只影响 system prompt 里的列表顺序。
- **自定义工具和扩展工具共用工具池**，名字不能重复。

### 什么时候该抽成 Pi Package

当这套组合要给别人用、要跨项目复用、要版本化时，按 s11 打包成一个 pi package。本章的装配就是那个包的「开发态」。

## 变更内容

| 组件 | s11 | s12 |
|---|---|---|
| 机制数量 | 每章一个 | 六个同会话 |
| 加载 | 分散在各脚本 | `DefaultResourceLoader` 一次装配 |
| 工具池 | 内置 + 单个 | 内置 + `todo_*` + `delegate` |
| 循环 | 不变 | 不变（正交，无冲突） |

## 试一下

```bash
npm run s12
npm run s12 -- "把'完成 s12'加入待办，再让子 agent 统计 s01..s11 的 README 总字数"
npm run s12 -- "依次执行 echo hi 和 sudo rm -rf /var"   # 观察权限闸门
```

你会看到：`todo_add` 和 `delegate` 被调用（s02+s08）、turn 级追踪（s04）、危险命令被拦截（s03）、子 agent 在隔离上下文里干活（s08）。一个会话，全部生效。

再试几个：

- `npm run s12 -- "/review s02_custom_tools/store.ts"` —— prompt 模板（s06）展开，同时结果截断（s04）在生效
- `npm run s12 -- "让子 agent 读 s01..s12 的 README，每个机制总结一句话"` —— 委派与技能同时在场，观察它们互不干扰

## 本章要点

- pi 的扩展点是正交的，可以自由组合，互不冲突。
- 所有机制都「挂在循环上」，没有一个是「写进循环里」。
- 扩展处理器按加载顺序链式执行，顺序即策略。
- 组合成熟后，用 pi package（s11）固化、分发。

## 结课

你已经走完一条完整的 harness 工程路径：

```
s01 循环  →  s02 工具  →  s03 权限  →  s04 事件  →  s05 知识
   →  s06 流程  →  s07 上下文  →  s08 委派  →  s09 进程边界
      →  s10 模型接入  →  s11 分发  →  s12 集成
```

回到最初那句话：

> **Agency 来自模型。Harness 来自你。**
>
> pi 把循环搭好了。剩下的世界，由你扩展。

**Bash is all you need。扩展点才是 harness 工程师的全部。**