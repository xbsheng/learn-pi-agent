[中文](README.md) | English

# s04: Events and hooks — hang on the loop, do not write into it

[s03](../s03_permission_gate/) → `s04` → [s05](../s05_skills/) → ...
> *"Hang on the loop, do not write into it."* — Observe with events, intervene with hooks, never touch the main loop.
>
> **Harness layer**: lifecycle — making the harness observable and intervenable.

---

## The problem

s03 already hung a permission gate on `tool_call`. But there are many more moments in pi's loop worth watching:

- Which tools did the model call this turn? Which was slowest? How many tokens, how much money in total?
- A tool returned a giant log and blew up the context — can we compress it before feeding it back?
- The user's prompt contains something sensitive — can we process it before it reaches the model?
- Can we inject a team convention automatically at the start of every session?

None of these should require patching pi's source, and none should be begged for in the system prompt. They are all **lifecycle sockets**.

## The solution

pi exposes every phase of the loop as an event. You subscribe; you do not fork:

```typescript
// Observe: session.subscribe() receives every AgentSessionEvent
session.subscribe((event) => {
  if (event.type === "tool_execution_start") console.error(`[tool] ${event.toolName}`);
  if (event.type === "turn_end") console.error(`[turn] ${event.toolResults.length} results`);
});

// Intervene: inside an extension, pi.on() receives mutable, blockable events
pi.on("tool_result", async (event) => {
  if (isBashToolResult(event)) {
    return { content: truncate(event.content, 4000) }; // modify the result, do not break the loop
  }
});
```

## How it works

Events come in two kinds with different jobs:

| | Observation `session.subscribe()` | Intervention `pi.on()` |
|---|---|---|
| Receives | live state of the loop | decision points of the loop |
| Can change behavior | no | yes (block, modify, inject) |
| Typical use | logging, UI, metering, progress bars | permission, compaction, rewriting, injecting context |

The full lifecycle (compare with the picture in s01):

```
session_start
  └─► user prompt
        ├─► input                     ← can intercept / rewrite user input
        ├─► before_agent_start        ← can inject messages, change the system prompt
        ├─► agent_start
        ├─► turn_start
        │     ├─► context             ← can modify the messages about to go to the model
        │     ├─► before_provider_request   ← can replace the request body
        │     ├─► after_provider_response   ← record status code / headers
        │     ├─► message_start / message_update / message_end
        │     ├─► tool_execution_start
        │     ├─► tool_call           ← can block / rewrite params (s03)
        │     ├─► tool_execution_update
        │     ├─► tool_result         ← can modify the result (this chapter)
        │     ├─► tool_execution_end
        │     └─► turn_end
        ├─► agent_end
        └─► agent_settled
```

**The key distinction**: `tool_execution_*` are observations, pure notifications; `tool_call` / `tool_result` are interventions whose return values carry meaning. `tool_result` handlers run in a chain like middleware — each sees the previous one's changes and may return a partial patch of `{ content }`, `{ details }`, `{ isError }`.

### This chapter's intervention: the first line of context defense

Tool output is the number one source of context explosions. A failing `npm test` can spew tens of thousands of lines of stack trace while the model only needs the last few dozen. Truncating in `tool_result` is cheaper than any other compression:

```typescript
pi.on("tool_result", async (event) => {
  if (!isBashToolResult(event)) return;
  const text = event.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  if (text.length <= MAX_CHARS) return;
  const half = Math.floor(MAX_CHARS / 2);
  return {
    content: [
      { type: "text", text: `${text.slice(0, half)}\n…(omitted ${text.length - MAX_CHARS} chars)…\n${text.slice(-half)}` },
    ],
    isError: event.isError,
  };
});
```

> **Keep head and tail, not just the head.** A log's value is usually at the start (where it went wrong) and the end (the final failure reason); a plain `slice(0, N)` throws away the most important tail. It is a detail of the compression strategy, and the difference between recovering the answer or not.

## What changed

| Component | s03 | s04 |
|---|---|---|
| Intervention points | only `tool_call` | all lifecycle hooks |
| Observation | none | `session.subscribe()` |
| Context control | none | `tool_result` truncation (first line of compaction) |
| Loop | unchanged | unchanged |

## Try it

```bash
npm run s04
npm run s04 -- "Run exactly one bash command, no pipes, redirects, head or tail: seq 1 20000. Then tell me the largest number"
```

Watch two things:

1. The `[turn]` and `[tool]` tracing in the terminal (observation).
2. The output of `seq 1 20000` is truncated before it returns to the model, yet the model can still answer (intervention). Without this hook, twenty thousand lines would go straight into the context.

A few more:

- `npm run s04 -- "Use bash to print seq 1 100, then sum it"` — the output is under the threshold, so the hook passes it through
- Change `MAX_CHARS` in `truncate.ts` to `200` and run again — can the model still answer when it only sees head and tail?
- Add a line to `subscribe` that times each tool; which one is slowest?

## Key points

- Observe with `session.subscribe()`, intervene with `pi.on()`; neither touches the main loop.
- `tool_result` is the best lightweight context-compression point.
- Other useful sockets: `input` (rewrite user input), `before_agent_start` (inject conventions), `context` (edit messages), `before_provider_request` (swap the request body).
- Intervention events can return `block` or patches; observation events are read-only.

## Next

The second use of events: let the harness carry knowledge itself. **s05: On-demand skill loading**.
