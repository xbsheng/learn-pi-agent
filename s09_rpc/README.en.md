[中文](README.md) | English

# s09: RPC integration — drive pi from any program with JSONL

[s08](../s08_subagents/) → `s09` → [s10](../s10_custom_provider/) → ...
> *"Drive pi from any program with JSONL."* — Commands in on stdin, events out on stdout.
>
> **Harness layer**: the process boundary — making the harness drivable from any language.

---

## The problem

The SDK (s01–s08) solves "use pi inside the same Node process". But many situations require pi as an **independent child process**:

- Your main program is Python / Go / Rust and you do not want to pull in Node for it.
- You need process isolation: if pi crashes, it must not take the host down with it.
- You are building your own IDE / web UI, with the backend and the agent deployed separately.

## The solution

`pi --mode rpc` turns the agent into a JSONL service: **commands in on stdin, events out on stdout**.

```bash
pi --mode rpc --no-session
```

Send a command (one JSON per line):

```json
{"id": "req-1", "type": "prompt", "message": "List the current directory"}
```

Receive a stream of events (one JSON per line):

```json
{"id":"req-1","type":"response","command":"prompt","success":true}
{"type":"agent_start"}
{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"The "}}
{"type":"agent_end","messages":[...]}
```

## How it works

### Three concepts

| Concept | Direction | Notes |
|---|---|---|
| **command** | stdin → pi | `prompt`, `steer`, `follow_up`, `abort`, `compact`, `set_model`… |
| **response** | pi → stdout | `{type:"response", command, success, id?}`, confirming a command was accepted |
| **event** | pi → stdout | agent lifecycle and streaming output, not tied to a request |

`id` is optional and correlates requests with responses. `success: true` only means the command **was accepted** (it may be queued); later failures are reported through the event stream, and the same id will not get a second response.

### The key: framing is strict JSONL

- Only `\n` is a separator.
- Input may contain `\r\n`; strip the trailing `\r` when parsing.
- **Do not use Node's `readline`**: it treats the perfectly legal `U+2028`/`U+2029` inside a JSON string as a newline and breaks the protocol. Use `StringDecoder` and split on `\n` by hand.

This chapter's `code.ts` is the complete minimal client.

### RPC vs SDK

| | SDK | RPC |
|---|---|---|
| Language | Node/TypeScript | any |
| Isolation | same process | separate process |
| Type safety | strong | by protocol convention |
| Direct `agent.state` access | yes | only via events |
| Good for | in-process integration, custom tools/extensions | cross-language, IDE, process isolation |

### Do not forget the extension UI protocol

Extensions also call dialogs such as `ctx.ui.confirm()` in RPC mode. pi then sends `extension_ui_request` on stdout, and the client must reply with `extension_ui_response` on stdin. `ctx.hasUI` is `true` in RPC mode — so s03's permission gate really does raise a confirmation request under RPC, instead of failing closed. See pi's `docs/rpc.md#extension-ui-protocol` for details.

## What changed

| Component | s08 | s09 |
|---|---|---|
| Driver | in-process SDK | separate child process over RPC |
| Language | Node / TypeScript | any |
| Channel | function calls | stdin / stdout JSONL |
| Isolation | shared process | process-level isolation |
| Reading `agent.state` | yes | only via events |
| Loop | unchanged | unchanged |

## Try it

```bash
npm run s09
npm run s09 -- "Use bash to count how many .ts files are in the current directory"
```

You will see the client print command responses, streamed text, and the final `agent_end`. Throughout, pi is a separate child process and the host only talks to it through pipes.

Any language works the same way: swap `spawn` for `subprocess.Popen` / `exec.Command`, swap `JSON.parse` for the language's parser — the protocol is unchanged.

A few more:

- `npm run s09 -- "Read package.json and tell me the project name"` — watch the `tool_execution_start` event
- In the client, bind `abort` to a 3-second timer and send a prompt "count from 1 to 100000"; watch the interruption before `agent_end`

## Key points

- RPC = commands on stdin + events on stdout + JSONL framing.
- Split frames strictly on `\n`; do not use readline.
- A `response` means the command was accepted, not that the task succeeded; results come from events.
- Cross-language or isolation → RPC; same process with types → SDK.

## Next

pi supports a pile of model providers out of the box, but you may want to connect your own inference service. **s10: Custom providers**.
