# s11: Pi Package — 打包你的工具、技能、模板，分享出去

[s10](../s10_custom_provider/) → `s11` → [s12](../s12_full_harness/) 
> *"打包你的工具、技能、模板，分享出去"* — 一个单元，一次安装。
>
> **Harness 层**：分发 — 让 harness 可复用、可版本化。

---

## 问题

到 s10 为止，你攒了一堆东西：自定义工具（s02）、权限扩展（s03）、截断钩子（s04）、skill（s05）、prompt 模板（s06）、provider（s10）。它们散落在各个目录里，靠 settings.json 一条条手动指路。

给同事用、发到团队、开源出去，都需要一个**打包单元**：装一次，全都有，能版本化，能更新。

## 解决方案

一个 pi package 就是一个 npm 包，用 `package.json` 的 `pi` 字段声明贡献哪些资源：

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

安装：

```bash
pi install ./pi-example-bundle                       # 本地目录
pi install git:github.com/you/pi-example-bundle@v1   # git（钉住 ref）
pi install npm:pi-example-bundle@0.1.0               # npm
pi install -l ...                                    # 写进项目设置，团队共享
```

装完 pi 自动发现并加载，不需要在别处再配置。

## 工作原理

### 两种声明方式

1. **`pi` 清单**（推荐）：显式列出每类资源的路径，支持 glob 和 `!排除`。
2. **约定目录**：没有 `pi` 字段时，pi 自动发现 `extensions/`、`skills/`、`prompts/`、`themes/`。

```
pi-example-bundle/
├── package.json          # pi 清单
├── extensions/
│   └── hello.ts          # 默认导出 (pi) => {...}
├── skills/
│   └── pkg-guide/SKILL.md
└── prompts/
    └── pkg-check.md
```

### 依赖规则

- **pi 核心包是 peer**：`@earendil-works/pi-coding-agent`、`pi-ai`、`pi-agent-core`、`pi-tui`、`typebox` 写进 `peerDependencies` 且 `"*"`，**不要打包**。pi 自带它们，打包会版本冲突。
- **第三方运行时依赖**放 `dependencies`。从 npm/git 安装时 pi 会跑 `npm install --omit=dev`，所以运行时用到的不能放 `devDependencies`。
- **引用其他 pi package** 的包要放进 `dependencies` + `bundledDependencies`。

### 安装源与去重

| 源 | 写法 | 落盘位置 |
|---|---|---|
| npm | `npm:pkg@1.2.3` | `~/.pi/agent/npm/` 或 `.pi/npm/` |
| git | `git:host/user/repo@v1` | `~/.pi/agent/git/...` |
| 本地 | `/abs/path` 或 `./rel` | 不复制，直接引用 |

同一个包同时出现在全局和项目设置里，**项目条目优先**（除非它标了 `autoload: false`）。身份按「npm 包名 / git 仓库 URL / 本地绝对路径」判定。

### 精细控制加载内容

settings.json 里可以用对象形式过滤包内资源：

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

`[]` 表示该类全不加载，`!pattern` 排除，`+path` 强制包含。

## 试一下

```bash
npm run s11
```

脚本用 `additionalExtensionPaths` / `additionalSkillPaths` / `additionalPromptTemplatePaths` 加载包内资源，打印出：1 个扩展、1 个 skill、1 个 prompt 模板，以及会话工具里确实出现了 `pkg_time`。

真实安装（会写 settings，建议在测试环境试）：

```bash
pi install ./s11_pi_packages/pi-example-bundle
pi -p "现在几点？"        # 模型可调用 pkg_time
/pkg-check                # 展开包内模板
```

## 本章要点

- pi package = npm 包 + `pi` 清单（或约定目录）。
- 核心包写 `peerDependencies`，别打包；运行时依赖放 `dependencies`。
- 三种安装源：npm / git / 本地；项目条目优先于全局。
- 用 settings 的对象形式可以按路径过滤包内资源。

## 下一章

每一章只讲一个机制。最后，把它们装回同一个会话。**s12：完整 Harness**。
