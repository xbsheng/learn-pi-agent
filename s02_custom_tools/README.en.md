[中文](README.md) | English

# s02: Custom tools — one capability, one handler

[s01](../s01_agent_session/) → `s02` → [s03](../s03_permission_gate/) → ...
> *"Add a capability, add just one handler."* — The loop stays still; the new tool registers into the tool pool.
>
> **Harness layer**: action — giving the model a pair of hands.

---

## The problem

pi gives the model four tools by default: `read`, `write`, `edit`, `bash`.

Those four are general, but every domain harness needs its own actions: query an internal ticket system, call a business API, touch a database, write structured state. None of those are elegantly expressed as "read a file" or "run a command", and you do not want the model shelling out to a hand-rolled `curl` every time.

## The solution

`defineTool()` declares a tool's **name, description, parameter schema, and execute function**. pi turns that into a tool definition the model can see, and runs it when the model calls it.

```typescript
import { Type } from "typebox";
import { createAgentSession, defineTool } from "@earendil-works/pi-coding-agent";

const todoAdd = defineTool({
  name: "todo_add",
  label: "Add Todo",
  description: "Append a todo to .todos.json in the current directory. Use when the user asks to record a task.",
  parameters: Type.Object({
    task: Type.String({ description: "The todo text" }),
    priority: Type.Optional(Type.Number({ description: "Priority 1-5, 1 highest, default 3" })),
  }),
  execute: async (_toolCallId, params) => {
    // ... do the real work
    return {
      content: [{ type: "text", text: `Added: #${id} ${params.task}` }],
      details: { id },
    };
  },
});

const { session } = await createAgentSession({
  customTools: [todoAdd, todoList],
});
```

The model sees a tool definition; the core maintains a dispatch map:

```
assistant: tool_use(todo_add, {task, priority})
        │
        ▼
   pi dispatch map ──► defineTool().execute(params)
        │                        │
        │  typebox validates     │  writes .todos.json
        ▼                        ▼
   tool_result ──────────► back to the model, loop continues
```

That is all. **Not one line of the main loop changes** — adding a tool is just registering one entry in a dispatch map; in pi the core owns that map and `customTools` is the registration point.

## How it works

Every field of `defineTool()` has a clear job:

| Field | Who reads it | Purpose |
|---|---|---|
| `name` | the model | the identifier used when calling; must be unique |
| `description` | the model | **decides when the model uses it**. The more specific, the better the hit rate |
| `parameters` | model + validation | a typebox schema, turned into JSON Schema and validated before the call |
| `execute` | the core | the function that actually runs, returning a tool result |
| `label` | humans | the name shown in the TUI |

The `execute` signature:

```typescript
async execute(toolCallId, params, signal, onUpdate, ctx) => ToolResult
```

- `params`: already validated and typed against the schema.
- `signal`: an `AbortSignal`. Fires when the user presses Esc; long tasks must check it.
- `onUpdate`: a streaming progress callback, so the user sees progress before the model sees the result.
- `ctx`: extension context (cwd, ui, sessionManager, and so on).

The return value:

```typescript
{
  content: [{ type: "text", text: "the result the model sees" }],
  details: { any: "structured data for the UI/caller, not part of the model context" },
  isError?: boolean,
}
```

> **`content` vs `details`**: `content` is fed back to the model as the `tool_result`; `details` lives only locally, for rendering UI or for an SDK to consume. Put verbose logs in `details` and the conclusion in `content` — that saves context.

### A trap you must know: tools run in parallel

pi **executes multiple tool calls from the same assistant message concurrently** (serial preflight, then parallel execution). That is a speedup for read-only tools and a disaster for read-modify-write: when the model asks to add three todos at once, two `todo_add` calls read an empty file simultaneously, each writes its own version, and the later write clobbers the earlier one.

This chapter's `store.ts` serializes writes through a promise chain:

```typescript
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}
```

This is exactly what a harness engineer worries about: **the model only issues actions; concurrency safety is the tool implementation's responsibility.** A regression test named "parallel calls do not lose data" guards this.

Two related details are handled in the same file:

- **Reads must take the lock too.** When `todo_list` and `todo_add` land in the same turn, an unlocked read path can read a half-written file (the `/review` template from the later prompt-template chapter really did surface this).
- **Writes must be atomic.** Write a temp file, then `rename`; if the process is killed mid-write, no half-finished JSON is left behind.

## What changed

| Component | s01 | s02 |
|---|---|---|
| Tool source | 4 built-ins | built-ins + `customTools` |
| Cost of one new capability | patch the core | one `defineTool()` |
| Parameter validation | none | typebox schema, validated before the call |
| Concurrency control | — | the tool's job (this chapter's serialized queue) |
| Loop | unchanged | unchanged |

## Try it

```bash
npm run s02
npm run s02 -- "Add 'review the permission gate', 'write s03 code', 'run' as todos with priorities 1, 2, 5, then list them"
cat .todos.json    # see that the tool really wrote to disk
npm test           # includes the parallel-write regression test
```

You will see the model decide on its own to call `todo_add` three times and `todo_list` once. It chose by reading `description`; there is no if-else routing in the code.

A few more:

- `npm run s02 -- "List all todos"` — only `todo_list` should match
- `npm run s02 -- "What is the weather today"` — neither tool should be called
- `npm run s02 -- "Add three todos: A, B, C, all priority 1"` — watch three `todo_add` calls run in parallel in one turn while the serialized queue keeps the data intact

## Key points

- One tool = one `defineTool()`, registered into `customTools`, loop untouched.
- `description` is the model's routing table; it matters more than the code.
- Check `signal`, or Esc cannot cancel your long task.
- Use `details` for structured data that should not be fed to the model.
- Multiple tool calls in one message run **in parallel**; tools with side effects must control concurrency themselves.

## Next

Tools can now be called — but any tool can be called, including `rm -rf` inside `bash`. **s03: The permission gate** draws a boundary around actions.
