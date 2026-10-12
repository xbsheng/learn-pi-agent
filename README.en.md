[中文](README.md) | English

# Learn Pi Agent — real agent harness engineering

> Modelled on the course structure of [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code), told with [pi](https://pi.dev): **Agency comes from the model, the harness comes from you.**

## In one sentence

**Agent = model + harness.**

A model (Claude, GPT, Qwen, …) learned to perceive, reason, and act during training. The harness is the world it lives in: tools, knowledge, observations, actions, boundaries. You are not writing intelligence — you are writing the room intelligence lives in.

pi has already built half of that room: an agent loop, four built-in tools (`read`/`write`/`edit`/`bash`), sessions and compaction, subprocess integration. pi's philosophy is a **small core + extensions** — it does not even build in sub agents or plan mode, leaving those extension points to you.

So the one-line difference from learn-claude-code is:

> **learn-claude-code teaches you to write the loop from scratch; learn-pi-agent teaches you to hang your own mechanisms on pi's loop.**

You do not write the loop, but every brick of the harness is yours: custom tools, permission gates, event hooks, on-demand skills, prompt templates, session branching, subagents, RPC integration, custom models, distributable Pi Packages.

## Course map

| Chapter | Mechanism | One-line motto |
|---|---|---|
| [s01](s01_agent_session/README.en.md) | AgentSession | *pi already runs the loop; you just plug in* |
| [s02](s02_custom_tools/README.en.md) | Custom tools | *Add a capability, add just one handler* |
| [s03](s03_permission_gate/README.en.md) | Permission gate | *Draw the boundary first, then hand over freedom* |
| [s04](s04_events_and_ui/README.en.md) | Events and hooks | *Hang on the loop, do not write into it* |
| [s05](s05_skills/README.en.md) | On-demand skills | *Load it when you need it, do not stuff the prompt* |
| [s06](s06_prompt_templates/README.en.md) | Prompt templates | *A common instruction, expanded by one slash command* |
| [s07](s07_sessions/README.en.md) | Sessions and branching | *Context fills up; save it and fork it* |
| [s08](s08_subagents/README.en.md) | Subagents | *Give a subtask a brand-new messages[]* |
| [s09](s09_rpc/README.en.md) | RPC integration | *Drive pi from any program with JSONL* |
| [s10](s10_custom_provider/README.en.md) | Custom providers | *The model is not only from one vendor* |
| [s11](s11_pi_packages/README.en.md) | Pi Package | *Pack your tools, skills, and templates and share them* |
| [s12](s12_full_harness/README.en.md) | The full harness | *Many mechanisms, one session* |

## The core pattern

An agent loop from scratch is about 30 lines; inside pi it turns like this:

```
User --> messages[] --> LLM --> response
                                  |
                          any tool_use block?
                       /                        \
                     yes                         no
                      |                           |
               run the tool                 return text
               append result
               back to LLM <---------------------+
```

pi implements it in TypeScript, and it is already running the moment you call it:

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({ sessionManager: SessionManager.inMemory() });

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("Look at the current directory and tell me what this project is");
```

Those two snippets are equivalent: one is the loop itself, the other is the loop's entry point. **Every later chapter adds one harness mechanism at this entry point, and the loop itself never changes.**

## Quick start

Requires **Node.js 24+** (running `.ts` directly relies on Node's type stripping; no build step).

```bash
cd learn-pi-agent
npm install

# Auth: reuse pi's existing login, or set an API key
#   pi /login
#   export ANTHROPIC_API_KEY=sk-ant-...

npm run s01        # the start: one minimal session
npm run s12        # the end: many mechanisms in one session
npm test           # unit tests for the permission policy and todo store (no network/API needed)
```

Each chapter directory:

```
sNN_xxx/
├── README.md      # concept + step-by-step breakdown + try it (Chinese)
├── README.en.md   # the same chapter in English
├── code.ts        # a runnable example
└── ...            # resources used by the chapter (extension / skill / prompt / package)
```

## Principles

- **Tools should be atomic, composable, and clearly described.** Each tool is one action the agent can take in its environment.
- **Load knowledge on demand.** A skill expands only when its description matches; it does not occupy the context up front.
- **Boundaries before freedom.** Destructive operations pass the `tool_call` gate before the model gets to run them.
- **Hang on the loop, do not change the loop.** Observe with events, intervene with hooks, extend with tools. pi's core never needs a fork.
- **Context is a finite resource.** Session persistence, branching, compaction, and subagents are all, at heart, ways of managing it.

## Mapping to learn-claude-code

> Never having read [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) does not affect this course at all.
> The table below is only for readers who want to compare the two paths: "hand-write from scratch" versus "hang on pi".

| learn-claude-code | learn-pi-agent |
|---|---|
| hand-write the agent loop (Python) | `createAgentSession()` (implemented by pi) |
| hand-write a TOOLS array | `defineTool()` / `pi.registerTool()` |
| hand-write dangerous-command checks | the `tool_call` hook |
| hand-write todo / subagent | derive a new session inside `defineTool()` |
| hand-write skill loading | Agent Skills standard + `DefaultResourceLoader` |
| hand-write context compact | `session.compact()` + automatic compaction |
| hand-write task/team/worktree | session tree + Pi Package + RPC |

**Bash is all you need. The extension points are the whole job of a harness engineer.**

## Tutorial site

`web/` in this repo is the companion tutorial site, styled after [learn.shareai.run](https://learn.shareai.run/zh/s01/) (Next.js + Tailwind 4, static export).
Chapter bodies come directly from each directory's `README.md` (Chinese) and `README.en.md` (English), extracted by `web/scripts/extract-content.ts`.
The site defaults to Chinese (`/zh/`); English lives at `/en/`.

```bash
cd web
npm install
npm run dev     # http://localhost:3000 → /zh/
npm run build   # static export to web/out
```

Deployment: `.github/workflows/deploy-vercel.yml` publishes to production with the Vercel CLI on every push to `main`.
Create the project in Vercel (Root Directory = `web`) and configure the repository secrets
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`;
then set `NEXT_PUBLIC_SITE_URL` in Vercel's environment variables to your production domain (used by sitemap / canonical).

## License

Tutorial text CC BY 4.0, code MIT.
