[中文](README.md) | English

# s06: Prompt templates — a slash command for a common instruction

[s05](../s05_skills/) → `s06` → [s07](../s07_sessions/) → ...
> *"A common instruction, expanded by one slash command."* — A reusable prompt the user triggers with one key.
>
> **Harness layer**: knowledge — standardizing "how to ask", too.

---

## The problem

Every time you want the agent to review code you type a long paragraph: "Please review this file, focus on correctness, concurrency, and error handling, order by severity, and do not be vague…"

That paragraph is knowledge worth freezing. But you cannot stuff it into the system prompt (you do not review code every time), and you should not retype it every time.

Skills (s05) solve "the model decides whether to use it"; here we want "the user explicitly wants this action run".

## The solution

A prompt template: one markdown file is one slash command.

`.pi/prompts/review.md`:

```markdown
---
description: Review the code quality of a given file
argument-hint: "<path>"
---
Review the file $1. Give conclusions in this order, each with file line numbers:

1. **Correctness risks** — logic errors, edge cases, missing error handling
2. **Concurrency and resources** — races, leaks, unclosed handles
3. **Simplifications** — code that can be deleted or replaced with the standard library

Do not be vague ("consider adding tests"). If you find nothing, say so.
```

```
user: /review src/app.ts
        │
        ▼
  expandPromptTemplates: true
        │  replaces $1 with src/app.ts
        ▼
  template body ──► sent to the model as an ordinary user message
```

The user types `/review src/app.ts`, `$1` is replaced with `src/app.ts`, and the whole thing is expanded and sent to the model.

## How it works

Templates support positional arguments and defaults:

| Syntax | Meaning |
|---|---|
| `$1` `$2` … | the Nth positional argument |
| `$@` / `$ARGUMENTS` | all arguments |
| `${1:-default}` | use `default` when argument 1 is empty |
| `${@:N}` | all arguments from the Nth on |
| `${@:N:L}` | L arguments starting from the Nth |

The filename (minus `.md`) is the command name: `review.md` → `/review`.

Where they load from:

```bash
~/.pi/agent/prompts/*.md   # global
.pi/prompts/*.md           # project-level
pi --prompt-template <path>
```

In the SDK, add the template directory to the discovery paths:

```typescript
const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  additionalPromptTemplatePaths: [resolve(import.meta.dirname, "prompts")],
});

await session.prompt("/review src/app.ts", { expandPromptTemplates: true });
```

> **Expansion happens before sending**: with `expandPromptTemplates: true`, `/review x` is replaced by the template body first; the model sees the full instruction, not the word `/review`. Extensions can trigger the same flow with `pi.sendUserMessage("/review x", { expandPromptTemplates: true })`.

### How the three divide the work

| | Trigger | Shape | Typical example |
|---|---|---|---|
| system prompt / AGENTS.md | always present | resident conventions | "Always answer in Chinese" |
| Skill (s05) | the model decides | multi-file workflow | generate release notes |
| Prompt template (s06) | the user types `/command` | one parameterized prompt | `/review <file>` |

## What changed

| Component | s05 | s06 |
|---|---|---|
| Trigger | the model decides | the user types `/command` |
| Shape | multi-file workflow | one parameterized prompt |
| Load timing | read the full body after a hit | body substituted before sending |
| Arguments | none | `$1`, `$@`, defaults |
| Loop | unchanged | unchanged |

## Try it

```bash
npm run s06
npm run s06 -- "s02_custom_tools/store.ts"   # expands to /review s02_custom_tools/store.ts
```

Watch the expanded instruction carry the file path, and the model answer in the three-part format the template defines.

A few more:

- `npm run s06 -- "s03_permission_gate/policy.ts"` — the same template, a different file, a different conclusion
- Add a `${1:-README.md}` default to `review.md`, then run `npm run s06` with no argument — confirm the default kicks in

> **A real easter egg**: while building this course, this `/review` template actually found the concurrency bug in s02's `store.ts` — `loadTodos` did not take the lock, so `add × list` in one turn could read a half-written file; and `writeFile` was not atomic. The fix (an internal lock-free `readTodos` + serialized reads + atomic temp-then-rename writes) was backported to s02. That is the value of a prompt template: freezing a one-off lesson into a repeatable process.

## Key points

- One `.md` file = one `/command`; the body is the prompt.
- Supports `$1`, `$@`, `${1:-default}`, `${@:N:L}`.
- In the SDK use the prompt-template paths plus `expandPromptTemplates: true`.
- Resident conventions go in AGENTS.md, model-chosen knowledge in skills, user-specified actions in templates.

## Next

So far every session has been `inMemory` and gone when the process exits. **s07: Sessions and branching** makes conversations persistable, resumable, and forkable.
