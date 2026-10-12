[中文](README.md) | English

# s08: Subagents — give a subtask a brand-new messages[]

[s07](../s07_sessions/) → `s08` → [s09](../s09_rpc/) → ...
> *"Give a subtask a brand-new messages[], and return only the final text as one tool result."* — Context isolation.
>
> **Harness layer**: delegation — trading context budget for focus.

---

## The problem

While solving a task, the main agent often needs to "investigate first, then come back and continue". For example:

- "Count the lines in every source file and find the three largest" — it reads dozens of files in the middle, all noise.
- "Research how this API is used" — it searches docs and tries commands, and only the conclusion matters.
- "Review this module" — the process is long, and the main thread only needs the conclusion.

If all this investigation happens in the main `messages[]`, there are two consequences: **the context is filled with intermediate steps**, and **the main agent's attention is dragged into details**. Human teams do not make everyone share one brain; neither should agents.

## The solution

A subagent is **a separate `AgentSession`** with a brand-new `messages[]`, its own system prompt, and its own toolset. When it finishes, only the final text returns to the main session as one `tool_result`.

```typescript
const sub = await createAgentSession({
  sessionManager: SessionManager.inMemory(),        // fresh, isolated
  resourceLoader: subLoader,                        // its own system prompt
  tools: ["read", "grep", "find", "ls"],            // read-only, so it cannot make a mess
});

sub.subscribe((event) => { /* bubble progress up via onUpdate */ });
await sub.prompt(task);
const answer = lastAssistantText(sub.agent.state.messages);
sub.dispose();

return { content: [{ type: "text", text: answer }], details: { ... } };
```

To the main session it looks like an ordinary tool call:

```
main messages[]:  ... user asks → assistant calls delegate → tool_result (subagent conclusion) → assistant summarizes
                                    │
                                    └─ subagent messages[] (separate, discarded when done)
```

## How it works

### Why isolation works

| | Main session | Subagent |
|---|---|---|
| `messages[]` | accumulates throughout | brand-new, discarded when done |
| system prompt | general | customizable per task |
| toolset | everything | can be narrowed (e.g. read-only) |
| context cost | one extra `tool_result` | all intermediate steps stay in its own context |

This is "trading context budget for focus": the subagent burns its own context reading 50 files, and the main session sees only the conclusion.

### Three implementation points

1. **The task description must be self-contained.** The subagent cannot see the main session's history; you must write "what is wanted, where the boundary is, what output format" entirely into the `task` string.
2. **Narrow the toolset.** Investigation subtasks get read-only tools (`read`/`grep`/`find`/`ls`); only give `edit`/`write` when the code must change. Least privilege applies to subagents too.
3. **Keep the return clean.** Put the conclusion in `content` (fed back to the main model) and metadata in `details` (line counts, timing, file lists). Do not stuff the intermediate process back in, or the isolation was wasted.

### How this differs from hand-writing the loop

Building a subagent from scratch means creating a new `messages[]`, running the loop yourself, and wrapping the final text as one tool result. In pi that collapses into a single call: **`createAgentSession()`** is that brand-new `messages[]`.

> **Note**: pi deliberately does not build in a subagent; it leaves that to extensions ([examples/extensions/subagent.ts](https://github.com/badlogic/pi-mono)). That is exactly the "small core + extensions" philosophy — you implement the delegation strategy you need.

## What changed

| Component | s07 | s08 |
|---|---|---|
| Subtask context | shared with the main session | a brand-new `messages[]` |
| Intermediate steps | enter the main context | stay in the subagent, discarded |
| Toolset | everything | can be narrowed (read-only here) |
| Return | all messages | one `tool_result` (the conclusion) |
| Loop | unchanged | unchanged |

## Try it

```bash
npm run s08
npm run s08 -- "Have a subagent count the lines of code.ts in chapters s01 to s08; you just summarize into a table"
```

Watch the main session's event stream: one `delegate` tool call, then the table. The subagent's file reads and commands all happen in its own context, and the main session's `messages` length barely changes.

A few more, focused on comparing "delegate" versus "do not delegate":

- `npm run s08 -- "Have a subagent find the 3 largest .ts files in this repo and give the total line count"` — the subagent reads many files; the main session gains one result
- `npm run s08 -- "Count the lines of code.ts in chapters s01 to s08 yourself"` (no delegation) — the same work, and the main session's message count grows noticeably

## Key points

- A subagent = a new `AgentSession` + a brand-new `messages[]` + an independent toolset.
- The task description must be self-contained; return only the conclusion.
- Investigation subtasks use read-only tools.
- This is "trading context budget for focus", and the basis for parallelizing subtasks.

## Next

Subagents solve "isolation within one process". To let **another language, another process** drive pi, you need RPC. **s09: RPC integration**.
