[中文](README.md) | English

# s01: AgentSession — pi is already running the loop

`s01` → [s02](../s02_custom_tools/) → s03 → s04 → ... → s12
> *"pi is already running the loop — you just plug in."* — One `prompt()` equals one full agent loop.
>
> **Harness layer**: the loop — the model's first connection to the real world.

---

## The problem

If you build an agent from scratch, the first thing you write is a `while True`: check whether the response contains a `tool_use` block, run the tool, append the result, and go back to the model.

If you use pi, that loop is already implemented locally — and it handles a pile of things you haven't thought about yet: multi-turn streaming, parallel tool execution, retries, automatic context compaction, session persistence, and resuming after interruption.

Rewriting it is a waste. What this chapter makes clear is: **which entry point pi hands you, and what it is actually looping over inside.**

## The solution

One `createAgentSession()` plus one `session.prompt()`.

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
  await session.prompt(process.argv.slice(2).join(" ") || "Describe this project in one sentence");
  console.log();
} finally {
  session.dispose();
}
```

`prompt()` does not resolve until the whole run is finished (including every tool call and retry). What you see in `subscribe` is each breath of the loop.

## How it works

The loop inside pi (simplified):

```
prompt(text)
  │
  ├─► assemble messages + tools + system prompt
  │
  └─► while True:
        response = LLM(messages, tools)
        messages.append(response)

        any tool_use?
          ├─ no  → done, prompt() resolves
          └─ yes → tool_call hook → execute tool → append tool_result
                     └──────────► back to the LLM
```

If you have hand-written this loop, map it piece by piece against the built-in one:

| Hand-written loop | pi (built in) | Where you intervene |
|---|---|---|
| `client.messages.create(...)` | the core calls the LLM | `before_provider_request` event |
| inspect the `tool_use` block | the core decides | no intervention needed |
| `TOOL_HANDLERS[name](**input)` | 4 built-in tools + your custom tools | `defineTool()` / `pi.registerTool()` |
| run directly, no check | run directly, trusts the model by default | `tool_call` hook (s03) |
| `messages.append(...)` | `AgentSession` state | `context` event / `session.state.messages` |
| — | persistence, compaction, retries | `SessionManager` (s07) |

> **The key insight**: pi does not hide the loop. It exposes every phase of the loop through **events** (observe) and **hooks** (intervene). Everything you learn in the chapters ahead hangs off this one loop.

The lifecycle of the event stream (memorize this picture — every later chapter uses it):

```
session_start
  └─► user prompt
        ├─► agent_start
        ├─► turn_start
        │     ├─► message_start / message_update / message_end
        │     ├─► tool_execution_start → tool_call → tool_result → tool_execution_end
        │     └─► turn_end
        ├─► agent_end
        └─► agent_settled   ← the final resting point after retries, compaction and follow-ups drain
```

## What changed

| Component | Before (bare model) | s01 (pi) |
|---|---|---|
| Agent loop | write your own `while` + `stop_reason` check | built into `createAgentSession()` |
| Tools | implement and dispatch yourself | built-in `read` / `write` / `edit` / `bash` |
| Message state | maintain `messages[]` by hand | maintained by `AgentSession` |
| Persistence | none | `SessionManager` (covered in s07) |
| Loop | — | unchanged, and it stays unchanged for the rest of the course |

## Try it

```bash
npm run s01
npm run s01 -- "List the current directory and describe one file in a sentence"
npm run s01 -- "Create hello.txt, write 'hi from pi' into it, then read it back to confirm"
```

The third command lets you watch the loop turn at least twice: one `write`, one `read`, with model reasoning in between.

A few more — each time, watch the order of events inside `subscribe`:

- `npm run s01 -- "Find every file that mentions TODO and summarize them"`
- `npm run s01 -- "Translate the first paragraph of the README into English"`

Did the model `read` first or `bash` first? How many turns did one prompt take?

## Key points

- `createAgentSession()` gives you an `AgentSession` that already knows how to loop.
- Use `subscribe()` to observe the loop, and built-in plus custom tools to give the model hands.
- `SessionManager.inMemory()` keeps the session off disk, which is right for scripts and tests; s07 switches to persistence.

## Next

A single built-in toolset is not enough. We shrink the cost of "add a tool" to the minimum — **s02: Custom tools**.
