[中文](README.md) | English

# s05: On-demand skill loading — load it when you need it, do not stuff the prompt

[s04](../s04_events_and_ui/) → `s05` → [s06](../s06_prompt_templates/) → ...
> *"Load it when you need it, do not stuff the prompt."* — The system prompt holds only names and descriptions; the body is read when it hits.
>
> **Harness layer**: knowledge — giving the agent domain expertise without blowing up the context.

---

## The problem

Suppose you want the agent to always generate release notes in your team's format: fixed categories (feat/fix/chore), a fixed tone, a fixed output template.

The most direct approach is to write it into `AGENTS.md` or the system prompt. The problem: **it occupies context forever**. If you have twenty such specs, you carry twenty manuals you almost never fully use. Context is a first-class resource; the more you carry, the less room is left for the actual task.

## The solution

A skill. A skill is a directory with a `SKILL.md`, following the [Agent Skills spec](https://agentskills.io/specification):

```
release-notes/
├── SKILL.md            # frontmatter (name/description) + body instructions
└── scripts/
    └── collect.sh      # a script referenced from the body
```

At startup pi puts only each skill's **name + description** into the system prompt (progressive disclosure):

```xml
<skills>
  <skill name="release-notes">Generate well-categorized release notes from git history. Use when the user asks for release notes or a changelog.</skill>
</skills>
```

When the model judges that a task hits, it reads the full `SKILL.md` with `read` and then executes the steps and scripts inside. **The body only enters the context when needed.**

## How it works

There are two ways to load a skill:

```typescript
// Option A: inject explicitly (good for SDK / self-contained examples; this chapter uses it)
const skill: Skill = {
  name: "release-notes",
  description: "Generate well-categorized release notes from git history. Use when the user asks for release notes, a changelog, or a version record.",
  filePath: resolve(import.meta.dirname, "skills/release-notes/SKILL.md"),
  baseDir: resolve(import.meta.dirname, "skills/release-notes"),
  source: "custom",
};

const loader = new DefaultResourceLoader({
  skillsOverride: (current) => ({ skills: [...current.skills, skill], diagnostics: current.diagnostics }),
});
```

```bash
# Option B: put it in the right directory and pi discovers it
~/.pi/agent/skills/       # global
.pi/skills/               # project-level (requires a trusted project)
pi --skill /path/to/skill # add explicitly on the CLI
```

Discovery rules: `<any skill dir>/<name>/SKILL.md` is discovered recursively; a root-level `.md` under `~/.pi/agent/skills/` or `.pi/skills/` with valid frontmatter also counts as a skill.

### Two hard rules

1. **`description` is the routing table.** The model decides "should I read this skill" solely from it; a vague description is as good as no skill. Compare:
   - Bad: `description: Helps with releases.`
   - Good: `description: Generate well-categorized release notes from git history. Use when the user asks for release notes, a changelog, or a version record.`
2. **Use relative paths in the body.** `scripts/collect.sh` resolves relative to the skill directory. After reading SKILL.md, the model runs it with `bash`.

### How it differs from a prompt template

| | Skill | Prompt template (s06) |
|---|---|---|
| Who triggers | the model, by matching the description | the user typing `/name` |
| Content | instructions + scripts + references, multi-file | one expandable prompt |
| Good for | domain workflows, SOPs, tool usage | a frequently used one-line instruction |

## What changed

| Component | s04 | s05 |
|---|---|---|
| Domain knowledge | only by stuffing the system prompt | a skill directory |
| Context cost | full text always resident | only name + description |
| Trigger | hard-coded by a human | the model matches the description |
| Shape | a block of text | instructions + scripts + references |
| Loop | unchanged | unchanged |

## Try it

```bash
npm run s05
npm run s05 -- "Generate release notes for this project"
```

Watch: the model first `read`s `SKILL.md`, then `bash`-runs `scripts/collect.sh`, then produces output in the categories the skill defines. Throughout, the system prompt grew by only two lines — the name and the description.

Try the counterexample: `npm run s05 -- "What is 1+1"`. It will not read the skill, because the description does not match.

A few more:

- `npm run s05 -- "Generate a changelog, keep only the fix category"` — the same skill, and the model trims its output per the constraints in the body
- Change the `description` in `SKILL.md` to "Helps with releases" and run again — the hit rate drops noticeably; that is how much the description weighs

## Key points

- A skill is progressively disclosed domain knowledge: only name + description stay resident.
- `description` decides the hit rate; write "what it does + when to use it".
- The body may reference scripts, references, and templates, resolved by relative path.
- Three ways to load: directory discovery, CLI `--skill`, SDK `skillsOverride`.

## Next

Skills are triggered by the model. Some instructions you want the **user** to trigger with one key. **s06: Prompt templates**.
