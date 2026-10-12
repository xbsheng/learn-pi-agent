[中文](README.md) | English

# s07: Sessions and branching — context fills up; you need to save and fork it

[s06](../s06_prompt_templates/) → `s07` → [s08](../s08_subagents/) → ...
> *"Context fills up; you need to save it and fork it."* — A session is a tree, not a straight line.
>
> **Harness layer**: context management — letting a conversation cross a process and cross a single path.

---

## The problem

The first six chapters all used `SessionManager.inMemory()`, gone the moment the process exits. Real use has three unavoidable needs:

1. **Persistence**: today the agent figured out the codebase; tomorrow you want to keep talking without re-explaining everything.
2. **Branching**: let the agent try plan A, find it dead ends, and go back to the fork point to try plan B, instead of continuing on top of the failed history.
3. **Compaction**: talk long enough and the context will exceed the limit; you need a way to slim down without losing the important parts.

## The solution

`SessionManager` offers three ways to open, plus a session tree:

```typescript
// New session, persisted
const sm = SessionManager.create(process.cwd());
const { session } = await createAgentSession({ sessionManager: sm });

// Resume the most recent session for this project
const sm2 = SessionManager.continueRecent(process.cwd());

// Open a specific file
const sm3 = SessionManager.open("/path/to/session.jsonl");
```

On disk a session is JSONL; every record carries an `id` / `parentId`, forming a tree:

```
        ┌─ user: "try plan A"  ─ assistant ─ tool ─ ...
root ───┤
        └─ user: "try plan B"  ─ assistant ─ ...      ← forks from the same point
```

`sm.getBranch()` is the branch from root to the current leaf, `sm.getLeafEntry()` is the current leaf, and `sm.getTree()` is the whole tree. Branching is moving the leaf: `sm.branch(entryId)`.

## How it works

### Persistence: JSONL + a tree

After each `prompt()`, pi appends the new entries to the session file. Entry types include user messages, assistant messages, tool results, compaction summaries, and custom entries (`pi.appendEntry()`). Because they are linked by `parentId`, resuming walks back from the current leaf to get "the full context on this branch" instead of stuffing the whole file into the model.

This is why pi's `/resume`, `/fork`, and `/clone` work: **the session file is itself a data structure, not a linear block of text.**

### Compaction: automatic + manual

pi compacts automatically as it approaches the context limit (configurable in settings). In the SDK you can also trigger it manually:

```typescript
await session.compact(); // generate a summary of the history, replacing earlier long messages
await session.compact("keep all API signatures and unresolved TODOs");
```

Compaction is not a plain truncation; it asks the model to produce a structured summary of earlier history, preserving goals, decisions, and unfinished business. The `tool_result` truncation from s04 is the first line of defense (slimming before it enters the context); `compact()` is the last (when the history truly will not fit).

### Branching: moving on the tree

```typescript
const entries = sm.getEntries();
const leaf = sm.getLeafEntry();
const branch = sm.getBranch();        // the current branch
sm.branch(entries[3].id);             // move the leaf back to entry 3; new messages fork from here
```

`AgentSessionRuntime` also offers higher-level `fork(entryId)` / `newSession()` / `switchSession()`; the interactive `/fork`, `/new`, and `/resume` are exactly those.

## What changed

| Component | s06 | s07 |
|---|---|---|
| Session storage | `inMemory` | JSONL on disk |
| Resume | none | `continueRecent` / `open` |
| Structure | linear | an `id` / `parentId` tree |
| Compaction | s04's result truncation | automatic compaction + `compact()` |
| Loop | unchanged | unchanged |

## Try it

```bash
npm run s07
```

The script does three things:

1. Create a persistent session, have the model remember a passphrase, print the session file path, then **close the session**.
2. Reopen it with `continueRecent()` and ask for the passphrase — if it answers correctly, the memory really came from disk, not RAM.
3. Finally print the session list and the number of entries on the current branch.

```bash
ls ~/.pi/agent/sessions/    # look at the JSONL on disk
```

Go one step further:

- `cat` the session file printed in step 1 and find the `parentId` field — that is the edge of the session tree
- In the s07 code, add `sm2.branch(sm2.getEntries()[0].id)` after `continueRecent`, ask for the passphrase again, and watch the history get cut back to the fork point

## Key points

- `SessionManager.create` / `continueRecent` / `open`, three entry points.
- A session is an `id`/`parentId` tree, not a linear log — that is the basis of branching.
- `compact()` generates a history summary; s04's result truncation is a cheaper front-line measure.
- Persistence gives the harness "long-term memory"; subagents (s08) and RPC (s09) both build on it.

## Next

With "can create a session" in hand, you can drop a subtask into a brand-new `messages[]`. **s08: Subagents**.
