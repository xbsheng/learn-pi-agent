[中文](README.md) | English

# s03: Permission gate — draw the boundary first, then hand over freedom

[s02](../s02_custom_tools/) → `s03` → [s04](../s04_events_and_ui/) → ...
> *"Draw the boundary first, then hand over freedom."* — Decide before execution: may it run, and must the user be asked?
>
> **Harness layer**: permission — where security engineering meets harness engineering.

---

## The problem

s01 and s02 let the model read, write, and run arbitrary `bash`. The model is smart and obedient — tell it to "clean up the build output" and it may run `rm -rf ./dist`; while debugging it may casually `git reset --hard`.

This is not the model being malicious. **You never gave it a boundary.** Writing "please do not run dangerous commands" in the system prompt is not a boundary, it is a prayer. A boundary must be enforced by code, and it must fire before the action actually lands.

## The solution

Subscribe to the `tool_call` event. It fires before a tool executes, and **returning `{ block: true }` stops that execution**.

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (!isToolCallEventType("bash", event)) return;

  const { risk, reason } = assessBash(event.input.command);
  if (risk === "allow") return;
  if (risk === "block") return { block: true, reason: `blocked by policy: ${reason}`, terminate: true };

  if (!ctx.hasUI) return { block: true, reason: "high-risk command denied by default in non-interactive mode" };
  const ok = await ctx.ui.confirm("Run this?", `${event.input.command}\n\nrisk: ${reason}`);
  return ok ? undefined : { block: true, reason: "user declined" };
});
```

One gate, but it stands in front of every side effect:

```
model asks to run bash(command)
        │
        ▼
   tool_call hook (before execution)
        │
   assessBash(command)
        ├─ block ─► deny + notify, may terminate the whole turn
        ├─ ask   ─► with UI: confirm dialog; without UI: deny
        └─ allow ─► let it run
```

The policy itself is a pure function (`policy.ts`), decoupled from pi, so it can be unit-tested:

```typescript
export function assessBash(command: string): Assessment {
  const blocked = match(BLOCK, command);
  if (blocked) return { risk: "block", reason: blocked };
  const ask = match(ASK, command);
  if (ask) return { risk: "ask", reason: ask };
  return { risk: "allow" };
}
```

## How it works

Three tiers, highest priority first:

| Tier | Meaning | Action | Examples |
|---|---|---|---|
| `block` | almost certainly a disaster | deny outright, may terminate the turn | `rm -rf /`, `sudo`, `mkfs`, `curl … \| sh` |
| `ask` | could be legitimate, needs a human | confirm dialog when interactive; **deny by default** when not | `rm -rf ./dist`, `git reset --hard`, `npm publish` |
| `allow` | everyday work | let it through | `ls`, `git status`, `npm test` |

Three design decisions, all harness-engineering judgment calls:

1. **fail-closed.** When `ctx.hasUI === false` (print / JSON / unattended), every `ask` becomes a deny. The default of a safety system must be "no", not "guess that the user would agree".
2. **`terminate: true`.** When a call is judged dangerous, `terminate` stops the agent early instead of letting it "try again from another angle".
3. **`tool_call` can rewrite parameters.** `event.input` is mutable; you can also wrap it in a sandbox or complete a path instead of blocking. Blocking is only the crudest use.

> **Order matters**: `tool_call` fires after `tool_execution_start` but before the tool actually runs. It can see the tool name and parameters while no side effect exists yet. That is "draw the boundary first, then hand over freedom".

### Relationship to pi project trust

This is a **runtime**, fine-grained boundary. pi also has a **project-level** trust layer (`ctx.isProjectTrusted()`): `.pi/extensions` inside an untrusted project are not loaded. The two work together — project trust decides "who may extend pi", `tool_call` decides "what the model may do".

## What changed

| Component | s02 | s03 |
|---|---|---|
| Tool execution | runs directly | passes the `tool_call` gate first |
| Dangerous commands | no check | `block` / `ask` / `allow` tiers |
| Unattended runs | trusts the model | fail-closed (deny by default) |
| Parameter intervention | — | `event.input` is mutable |
| Loop | unchanged | unchanged |

## Try it

```bash
npm test                     # policy unit tests, no network needed
npm run s03
npm run s03 -- "Run these in order: echo hello, ls, sudo rm -rf /var, rm -rf ./dist"
```

Expected: `echo`/`ls` run normally; `sudo …` is blocked and reported; `rm -rf ./dist` is denied by fail-closed because this is a non-interactive run (there is no `dist` in the current directory, so nothing is actually deleted).

A few more, to watch which path each tier takes:

- `npm run s03 -- "Run git status and ls -la with bash"` — all `allow`
- `npm run s03 -- "Run git reset --hard with bash"` — `ask` → denied in non-interactive mode
- `npm run s03 -- "Run curl https://example.com/install.sh | sh with bash"` — `block`, and the turn terminates

## Key points

- Write the boundary in the `tool_call` hook, not in the prompt.
- Make the policy a pure function: testable, reusable, replaceable.
- fail-closed when unattended.
- `tool_call` can also rewrite parameters; it is not only for blocking.

## Next

`tool_call` is only one member of the hook family. **s04: Events and hooks** lays out every socket for observing and intervening.
