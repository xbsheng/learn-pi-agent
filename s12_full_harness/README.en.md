[中文](README.md) | English

# s12: The full harness — many mechanisms, one session

[s11](../s11_pi_packages/) → `s12`
> *"Many mechanisms, one session."* — Every extension point ultimately flows into the same loop.
>
> **Harness layer**: integration — assembling the parts into a machine.

---

## The problem

The previous eleven chapters each demonstrated one mechanism, but a real product never uses only one. A usable coding-agent harness usually needs several at once:

- its own tools (business actions)
- a permission gate (a safety boundary)
- result truncation (a context budget)
- on-demand skills (domain knowledge)
- prompt templates (user flows)
- subagents (task isolation)

Do they conflict? Does load order matter? **This chapter puts them into one `AgentSession` to prove pi's extension points are orthogonal.**

## The solution

One session, six mechanisms:

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

Not one line of pi's core is changed, and no two pieces of configuration fight each other.

## How it works

### The assembly diagram

```
                        ┌─────────────────────────────────────────┐
   prompt ──► /review ──►  prompt template expands (s06)            │
             │           └─────────────────────────────────────────┘
             ▼
        AgentSession ──► the system prompt holds only skill name+desc (s05)
             │
             ▼
        ┌─ while loop ─────────────────────────────────────────┐
        │  the LLM picks an action                              │
        │     │                                                 │
        │     ├─ tool_call  ──► permission gate: allow/ask/block (s03)
        │     │                                                 │
        │     ├─ execute ────► custom tools todo_* (s02)         │
        │     │                delegate ──► sub AgentSession (s08)
        │     │                                                 │
        │     └─ tool_result ─► truncate long output (s04)       │
        │                                                       │
        │  result appended, back to the LLM ◄───────────────────┘
        └───────────────────────────────────────────────────────┘
```

### Where each mechanism intervenes

| Mechanism | Chapter | Intervention point | Changes the loop? |
|---|---|---|---|
| Custom tools | s02 | the tool pool | no |
| Permission gate | s03 | `tool_call` | no |
| Result truncation | s04 | `tool_result` | no |
| Skills | s05 | system prompt + `read` | no |
| Prompt templates | s06 | before the prompt is sent | no |
| Subagent | s08 | a new session inside tool execution | no |

**Every row of this table says "no" — that is the whole point of pi's extension design.**

### Load order matters

- **Extension load order = handler order.** Multiple `tool_call` / `tool_result` handlers run in a chain in load order. The permission gate should come early (blocking early saves compute); truncation can come late (trim the final result).
- **Skills and templates are just resources**; their order does not change behavior, only the order of the list in the system prompt.
- **Custom tools and extension tools share one tool pool**, and names must be unique.

### When to extract a Pi Package

When this combination is meant for others, must be reused across projects, and must be versioned, package it as a pi package per s11. This chapter's assembly is that package's "development form".

## What changed

| Component | s11 | s12 |
|---|---|---|
| Mechanism count | one per chapter | six in one session |
| Loading | scattered across scripts | one assembly via `DefaultResourceLoader` |
| Tool pool | built-ins + one | built-ins + `todo_*` + `delegate` |
| Loop | unchanged | unchanged (orthogonal, no conflicts) |

## Try it

```bash
npm run s12
npm run s12 -- "Add 'finish s12' as a todo, then have a subagent count the total characters of README in s01..s11"
npm run s12 -- "Run echo hi and sudo rm -rf /var in order"   # watch the permission gate
```

You will see: `todo_add` and `delegate` called (s02+s08), turn-level tracing (s04), the dangerous command blocked (s03), and the subagent working in an isolated context (s08). One session, everything live.

A few more:

- `npm run s12 -- "/review s02_custom_tools/store.ts"` — the prompt template (s06) expands while result truncation (s04) is in effect
- `npm run s12 -- "Have a subagent read the README of s01..s12 and summarize each mechanism in one sentence"` — delegation and skills present at once; watch them not interfere

## Key points

- pi's extension points are orthogonal: combine freely, no conflicts.
- Every mechanism "hangs on the loop"; none is "written into the loop".
- Extension handlers run in a chain in load order; order is policy.
- Once the combination matures, freeze and distribute it with a pi package (s11).

## Course wrap-up

You have walked a complete harness-engineering path:

```
s01 loop  →  s02 tools  →  s03 permission  →  s04 events  →  s05 knowledge
   →  s06 flow  →  s07 context  →  s08 delegation  →  s09 process boundary
      →  s10 model access  →  s11 distribution  →  s12 integration
```

Back to the line we started with:

> **Agency comes from the model. Harness comes from you.**
>
> pi already built the loop. The rest of the world is yours to extend.

**Bash is all you need. The extension points are the whole job of a harness engineer.**
