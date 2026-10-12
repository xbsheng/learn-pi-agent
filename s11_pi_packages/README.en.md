[中文](README.md) | English

# s11: Pi Package — pack your tools, skills, and templates and share them

[s10](../s10_custom_provider/) → `s11` → [s12](../s12_full_harness/)
> *"Pack your tools, skills, and templates and share them."* — One unit, one install.
>
> **Harness layer**: distribution — making the harness reusable and versionable.

---

## The problem

By s10 you have accumulated a pile of things: custom tools (s02), a permission extension (s03), a truncation hook (s04), a skill (s05), a prompt template (s06), a provider (s10). They are scattered across directories, each pointed at by hand from settings.json.

Sharing with a colleague, shipping to the team, or open-sourcing all require a **packaging unit**: install once, get everything, versionable, updatable.

## The solution

A pi package is an npm package whose `package.json` uses the `pi` field to declare which resources it contributes:

```json
{
  "name": "pi-example-bundle",
  "version": "0.1.0",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "typebox": "*"
  }
}
```

Install:

```bash
pi install ./pi-example-bundle                       # a local directory
pi install git:github.com/you/pi-example-bundle@v1   # git (pinned ref)
pi install npm:pi-example-bundle@0.1.0               # npm
pi install -l ...                                    # write into project settings, shared with the team
```

After install, pi discovers and loads it automatically; no further configuration elsewhere.

## How it works

### Two ways to declare

1. **The `pi` manifest** (recommended): list each resource class's path explicitly; supports globs and `!exclude`.
2. **Conventional directories**: without a `pi` field, pi auto-discovers `extensions/`, `skills/`, `prompts/`, `themes/`.

```
pi-example-bundle/
├── package.json          # the pi manifest
├── extensions/
│   └── hello.ts          # default export (pi) => {...}
├── skills/
│   └── pkg-guide/SKILL.md
└── prompts/
    └── pkg-check.md
```

### Dependency rules

- **pi core packages are peers**: put `@earendil-works/pi-coding-agent`, `pi-ai`, `pi-agent-core`, `pi-tui`, and `typebox` in `peerDependencies` with `"*"` — **do not bundle them**. pi ships them; bundling causes version conflicts.
- **Third-party runtime dependencies** go in `dependencies`. When installing from npm/git, pi runs `npm install --omit=dev`, so anything needed at runtime must not be in `devDependencies`.
- A package that **references another pi package** puts it in `dependencies` + `bundledDependencies`.

### Install sources and de-duplication

| Source | Syntax | Where it lands |
|---|---|---|
| npm | `npm:pkg@1.2.3` | `~/.pi/agent/npm/` or `.pi/npm/` |
| git | `git:host/user/repo@v1` | `~/.pi/agent/git/...` |
| local | `/abs/path` or `./rel` | not copied, referenced directly |

If the same package appears in both global and project settings, the **project entry wins** (unless it is marked `autoload: false`). Identity is determined by "npm package name / git repo URL / local absolute path".

### Fine-grained control over what loads

In settings.json you can filter a package's resources with the object form:

```json
{
  "packages": [
    {
      "source": "npm:my-package",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"]
    }
  ]
}
```

`[]` loads none of that class, `!pattern` excludes, and `+path` force-includes.

## What changed

| Component | s10 | s11 |
|---|---|---|
| Distribution unit | scattered directories | one npm package |
| Declaration | hand-pointed settings.json | the `pi` manifest / conventional dirs |
| Install | manual copy | `pi install` |
| Dependencies | — | core packages as peers, runtime deps in `dependencies` |
| Loop | unchanged | unchanged |

## Try it

```bash
npm run s11
```

The script loads the bundle's resources via `additionalExtensionPaths` / `additionalSkillPaths` / `additionalPromptTemplatePaths` and prints: 1 extension, 1 skill, 1 prompt template, plus that `pkg_time` really shows up in the session's tools.

A real install (it writes settings; try it in a test environment):

```bash
pi install ./s11_pi_packages/pi-example-bundle
pi -p "What time is it?"   # the model can call pkg_time
/pkg-check                 # expands the packaged template
```

A few more:

- Delete the `pi` manifest from `package.json`, keep only conventional directories, and run `npm run s11` again — the resources are still discovered
- In settings, filter with the object form: `"extensions": ["extensions/*.ts", "!extensions/legacy.ts"]`, and watch the load count change

## Key points

- A pi package = an npm package + a `pi` manifest (or conventional directories).
- Core packages go in `peerDependencies` and are not bundled; runtime deps go in `dependencies`.
- Three install sources: npm / git / local; a project entry beats a global one.
- The object form in settings lets you filter a package's resources by path.

## Next

Each chapter covered one mechanism. Finally, we load them all back into one session. **s12: The full harness**.
