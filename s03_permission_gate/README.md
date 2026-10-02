# s03: 权限闸门 — 先划边界，再给自由

[s02](../s02_custom_tools/) → `s03` → [s04](../s04_events_and_ui/) → ...
> *"先划边界，再给自由"* — 在工具执行前判断：能不能做、要不要问用户。
>
> **Harness 层**：权限 — 安全工程与 harness 工程的交汇点。

---

## 问题

s01 和 s02 让模型能读、能写、能执行任意 `bash`。模型很聪明，也很听话 —— 你说「清理一下构建产物」，它可能给你 `rm -rf ./dist`；它也可能在排查问题时顺手 `git reset --hard`。

这不是模型坏，是**你没有给它边界**。把 system prompt 写成「请不要执行危险命令」不叫边界，那叫祈祷。边界必须由代码强制执行，且发生在动作真正落地之前。

## 解决方案

订阅 `tool_call` 事件。它在工具执行前触发，**返回 `{ block: true }` 就能阻止这次执行**。

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (!isToolCallEventType("bash", event)) return;

  const { risk, reason } = assessBash(event.input.command);
  if (risk === "allow") return;
  if (risk === "block") return { block: true, reason: `权限策略拦截：${reason}`, terminate: true };

  if (!ctx.hasUI) return { block: true, reason: "非交互模式下默认拒绝高风险命令" };
  const ok = await ctx.ui.confirm("确认执行？", `${event.input.command}\n\n风险：${reason}`);
  return ok ? undefined : { block: true, reason: "用户拒绝" };
});
```

策略本身是一个纯函数（`policy.ts`），和 pi 解耦，可以单测：

```typescript
export function assessBash(command: string): Assessment {
  const blocked = match(BLOCK, command);
  if (blocked) return { risk: "block", reason: blocked };
  const ask = match(ASK, command);
  if (ask) return { risk: "ask", reason: ask };
  return { risk: "allow" };
}
```

## 工作原理

三档决策，优先级从高到低：

| 档位 | 含义 | 动作 | 例子 |
|---|---|---|---|
| `block` | 几乎必然是灾难 | 直接拒绝，可终止整个 turn | `rm -rf /`、`sudo`、`mkfs`、`curl … \| sh` |
| `ask` | 可能合法，需要人判断 | 交互模式弹窗确认；非交互模式**默认拒绝** | `rm -rf ./dist`、`git reset --hard`、`npm publish` |
| `allow` | 日常操作 | 放行 | `ls`、`git status`、`npm test` |

三个关键设计决策，都是 harness 工程师的判断：

1. **fail-closed（默认拒绝）。** `ctx.hasUI === false` 时（print / JSON / 无人值守），`ask` 一律拒绝。安全系统的默认值必须是「不」，而不是「猜用户会同意」。
2. **`terminate: true`。** 当一次调用被判定为危险时，`terminate` 让 agent 提前停下，而不是「换个姿势再试一次」。
3. **`tool_call` 可以改参数。** `event.input` 是可变的，你也可以不拦截而是给它套一层沙箱或补全路径。拦截只是最粗的用法。

> **边界顺序很重要**：`tool_call` 在 `tool_execution_start` 之后、真正执行之前触发。所以它看得见工具名和参数，却还没有产生副作用。这就是「先划边界，再给自由」。

### 与 pi 项目信任的关系

这是**运行时**的细粒度边界。pi 还有一层**项目级**信任（`ctx.isProjectTrusted()`）：未受信项目里的 `.pi/extensions` 不会加载。两层配合：项目信任决定「谁能扩展 pi」，`tool_call` 决定「模型能做什么」。

## 试一下

```bash
npm test                     # 策略单测，不需要网络
npm run s03
npm run s03 -- "依次执行：echo hello、ls、sudo rm -rf /var、rm -rf ./dist"
```

预期：`echo`/`ls` 正常执行；`sudo …` 被拦截并通知；`rm -rf ./dist` 因为是非交互模式被 fail-closed 拒绝（当前目录没有 `dist`，所以不会误删东西）。

## 本章要点

- 边界写在 `tool_call` 钩子里，不写在 prompt 里。
- 策略做成纯函数，可测试、可复用、可替换。
- 无人值守时 fail-closed。
- `tool_call` 还能改参数，不只用来拦截。

## 下一章

`tool_call` 只是钩子家族的一个。**s04：事件与钩子** 系统梳理观察与干预的全部插口。
