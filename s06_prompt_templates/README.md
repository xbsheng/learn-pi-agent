# s06: Prompt 模板 — 常用指令，一条斜杠命令展开

[s05](../s05_skills/) → `s06` → [s07](../s07_sessions/) → ...
> *"常用指令，一条斜杠命令展开"* — 用户一键触发的、可复用的提示词。
>
> **Harness 层**：知识 — 把「怎么问」也标准化。

---

## 问题

你每次让 agent 审代码都要打一长串：「请审查这个文件，关注正确性、并发、错误处理，按严重程度排序，不要泛泛而谈……」

这段话本身是知识，值得固化。但你不能把它塞进 system prompt（不是每次都审代码），也不该每次手打。

Skill（s05）解决的是「模型自己判断该不该用」，而这里要的是「用户明确要执行这个动作」。

## 解决方案

Prompt 模板：一个 markdown 文件就是一个斜杠命令。

`.pi/prompts/review.md`：

```markdown
---
description: 审查指定文件的代码质量
argument-hint: "<path>"
---
请审查文件 $1。按以下顺序给出结论，每一条都给出文件行号：

1. **正确性风险** — 逻辑错误、边界条件、错误处理缺失
2. **并发与资源** — 竞态、泄漏、未关闭的句柄
3. **可简化处** — 可以删掉或换成标准库的代码

不要泛泛而谈「建议增加测试」这类套话。没有发现就明说。
```

用户输入 `/review src/app.ts`，`$1` 被替换成 `src/app.ts`，整段展开后发给模型。

## 工作原理

模板支持位置参数和默认值：

| 语法 | 含义 |
|---|---|
| `$1` `$2` … | 第 N 个位置参数 |
| `$@` / `$ARGUMENTS` | 全部参数 |
| `${1:-default}` | 参数 1 为空时用 default |
| `${@:N}` | 从第 N 个开始的所有参数 |
| `${@:N:L}` | 从第 N 个开始的 L 个参数 |

文件名（去掉 `.md`）就是命令名：`review.md` → `/review`。

加载方式：

```bash
~/.pi/agent/prompts/*.md   # 全局
.pi/prompts/*.md           # 项目级
pi --prompt-template <path>
```

SDK 里把模板目录加进发现路径：

```typescript
const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  additionalPromptTemplatePaths: [resolve(import.meta.dirname, "prompts")],
});

await session.prompt("/review src/app.ts", { expandPromptTemplates: true });
```

> **展开发生在发送前**：`expandPromptTemplates: true` 时，`/review x` 会先被替换成模板正文，模型看到的是完整指令，不是 `/review` 这个词。扩展里可以用 `pi.sendUserMessage("/review x", { expandPromptTemplates: true })` 触发同样的流程。

### 三者如何分工

| | 触发者 | 内容形态 | 典型例子 |
|---|---|---|---|
| system prompt / AGENTS.md | 永远在场 | 常驻规范 | 「所有回复用中文」 |
| Skill（s05） | 模型自主 | 多文件工作流 | 生成 release notes |
| Prompt 模板（s06） | 用户 `/命令` | 一段可带参提示词 | `/review <file>` |

## 试一下

```bash
npm run s06
npm run s06 -- "s02_custom_tools/store.ts"   # 会展开成 /review s02_custom_tools/store.ts
```

观察展开后的指令里带上了文件路径，模型按模板规定的三段式输出。

> **真实彩蛋**：这个 `/review` 模板在开发本教程时，真的查出了 s02 `store.ts` 的并发 bug —— `loadTodos` 没进锁，`add × list` 同轮会读到写了一半的文件；而且 `writeFile` 非原子。修复（内部无锁 `readTodos` + 串行化读 + temp+rename 原子写）已经回填到 s02。这就是 prompt 模板的价值：把一次性的经验固化成可重复执行的流程。

## 本章要点

- 一个 `.md` 文件 = 一个 `/命令`，正文就是提示词。
- 支持 `$1`、`$@`、`${1:-默认}`、`${@:N:L}`。
- SDK 用 `promptsOverride` + `expandPromptTemplates: true`。
- 常驻规范走 AGENTS.md，模型自选走 skill，用户指定走模板。

## 下一章

到目前为止所有会话都是 `inMemory`，关掉就没了。**s07：会话与分支** 让对话可持久、可恢复、可分叉。
