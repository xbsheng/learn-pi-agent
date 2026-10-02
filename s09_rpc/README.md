# s09: RPC 集成 — 用 JSONL 把 pi 接进任何程序

[s08](../s08_subagents/) → `s09` → [s10](../s10_custom_provider/) → ...
> *"用 JSONL 把 pi 接进任何程序"* — stdin 发命令，stdout 收事件。
>
> **Harness 层**：进程边界 — 让 harness 可被任意语言驱动。

---

## 问题

SDK（s01–s08）解决的是「在同一个 Node 进程里用 pi」。但很多场景要求 pi 作为一个**独立子进程**：

- 你的主程序是 Python / Go / Rust，不想为它引入 Node。
- 你需要进程隔离：pi 崩了不能带崩宿主。
- 你要做一个自己的 IDE / Web UI，后端和 agent 分开部署。

## 解决方案

`pi --mode rpc` 把 agent 变成一个 JSONL 服务：**stdin 收命令，stdout 吐事件**。

```bash
pi --mode rpc --no-session
```

发一条命令（每行一个 JSON）：

```json
{"id": "req-1", "type": "prompt", "message": "列出当前目录"}
```

收一串事件（每行一个 JSON）：

```json
{"id":"req-1","type":"response","command":"prompt","success":true}
{"type":"agent_start"}
{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"当前"}}
{"type":"agent_end","messages":[...]}
```

## 工作原理

### 三个概念

| 概念 | 方向 | 说明 |
|---|---|---|
| **命令** | stdin → pi | `prompt`、`steer`、`follow_up`、`abort`、`compact`、`set_model`… |
| **响应** | pi → stdout | `{type:"response", command, success, id?}`，确认命令是否被接受 |
| **事件** | pi → stdout | agent 生命周期与流式输出，不需要请求 |

`id` 可选，用于请求/响应关联。`success: true` 只表示命令**被接受**（可能已排队），后续失败通过事件流报告，不会为同一个 id 再发一次 response。

### 关键：帧协议是严格的 JSONL

- 只用 `\n` 作分隔符。
- 输入允许 `\r\n`，解析时去掉末尾 `\r`。
- **不要用 Node 的 `readline`**：它会把 JSON 字符串里合法的 `U+2028`/`U+2029` 也当换行，破坏协议。用 `StringDecoder` 手动按 `\n` 切。

本章的 `code.ts` 就是这个最小客户端的完整实现。

### RPC vs SDK

| | SDK | RPC |
|---|---|---|
| 语言 | Node/TypeScript | 任意 |
| 隔离 | 同进程 | 独立进程 |
| 类型安全 | 强 | 靠协议约定 |
| 直接访问 `agent.state` | 可以 | 只能靠事件 |
| 适用 | 同进程集成、自定义工具/扩展 | 跨语言、IDE、进程隔离 |

### 别忘了扩展 UI 协议

扩展在 RPC 模式下也会调用 `ctx.ui.confirm()` 等对话框。这时 pi 会通过 stdout 发 `extension_ui_request`，客户端必须在 stdin 回 `extension_ui_response`。`ctx.hasUI` 在 RPC 模式是 `true` —— 所以 s03 的权限闸门在 RPC 下会真的弹出确认请求，而不是 fail-closed。协议细节见 pi 文档 `docs/rpc.md#extension-ui-protocol`。

## 试一下

```bash
npm run s09
npm run s09 -- "用 bash 数一数当前目录有多少个 .ts 文件"
```

你会看到客户端打印出命令响应、流式文本、最终 `agent_end`。整个过程 pi 是一个独立子进程，宿主只通过管道通信。

换成任何语言都一样：把 `spawn` 换成 `subprocess.Popen` / `exec.Command`，把 `JSON.parse` 换成对应语言的解析，协议不变。

## 本章要点

- RPC = stdin 命令 + stdout 事件 + JSONL 帧。
- 严格按 `\n` 切帧，别用 readline。
- `response` 表示命令被接受，不表示任务成功；结果看事件。
- 跨语言、要隔离就 RPC；同进程、要类型就 SDK。

## 下一章

pi 内置支持一堆模型供应商，但你可能想接自己的推理服务。**s10：自定义 Provider**。
