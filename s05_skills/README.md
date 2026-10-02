# s05: Skill 按需加载 — 用到时再加载，别全塞 prompt

[s04](../s04_events_and_ui/) → `s05` → [s06](../s06_prompt_templates/) → ...
> *"用到时再加载，别全塞 prompt"* — 系统提示里只有名字和描述，正文等命中再读。
>
> **Harness 层**：知识 — 给 agent 领域专长，且不撑爆上下文。

---

## 问题

假设你要让 agent 每次都按你团队的规范生成 release notes：固定的分类（feat/fix/chore）、固定的语气、固定的输出模板。

最直接的做法是写进 `AGENTS.md` 或 system prompt。问题是：**它永远占着上下文**。你有 20 个这样的规范，就背了 20 份从来不全用到的说明书。上下文是一等资源，背得越多，留给真正任务的空间越少。

## 解决方案

Skill。一个 skill 是一个带 `SKILL.md` 的目录，遵循 [Agent Skills 标准](https://agentskills.io/specification)：

```
release-notes/
├── SKILL.md            # frontmatter(name/description) + 正文指令
└── scripts/
    └── collect.sh      # 正文里引用的脚本
```

pi 启动时只把每个 skill 的 **name + description** 放进 system prompt（渐进披露）：

```xml
<skills>
  <skill name="release-notes">根据 git 历史生成分类清晰的 release notes。当用户要求生成发布说明/changelog 时使用。</skill>
</skills>
```

当模型判断任务命中，它才用 `read` 去读 `SKILL.md` 全文，再执行里面的步骤和脚本。**正文永远只在需要时进入上下文。**

## 工作原理

加载一个 skill，有两种方式：

```typescript
// 方式 A：显式注入（适合 SDK / 自包含示例，本章用这个）
const skill: Skill = {
  name: "release-notes",
  description: "根据 git 历史生成分类清晰的 release notes。当用户要求生成发布说明/changelog 时使用。",
  filePath: resolve(import.meta.dirname, "skills/release-notes/SKILL.md"),
  baseDir: resolve(import.meta.dirname, "skills/release-notes"),
  source: "custom",
};

const loader = new DefaultResourceLoader({
  skillsOverride: (current) => ({ skills: [...current.skills, skill], diagnostics: current.diagnostics }),
});
```

```bash
# 方式 B：放对目录，pi 自动发现
~/.pi/agent/skills/       # 全局
.pi/skills/               # 项目级（需项目受信）
pi --skill /path/to/skill # CLI 显式追加
```

自动发现的规则：`<任意 skill 目录>/<name>/SKILL.md` 会被递归发现；`~/.pi/agent/skills/` 和 `.pi/skills/` 下的根级 `.md` 若带合法 frontmatter 也算一个 skill。

### 两条硬规则

1. **`description` 是路由表。** 模型只靠它决定「要不要读这个 skill」，写得含糊就等于没有这个 skill。对比：
   - 差：`description: 帮助处理发布。`
   - 好：`description: 根据 git 历史生成分类清晰的 release notes。当用户要求生成发布说明、changelog 或版本记录时使用。`
2. **正文里用相对路径。** `scripts/collect.sh` 相对于 skill 目录解析。模型读完 SKILL.md 后会用 `bash` 执行它。

### 和 prompt template 的区别

| | Skill | Prompt 模板（s06） |
|---|---|---|
| 谁触发 | 模型按 description 自主判断 | 用户输入 `/name` |
| 内容 | 指令 + 脚本 + 参考文档，可多文件 | 一段可展开的提示词 |
| 适合 | 领域工作流、SOP、工具用法 | 常用的一句话指令 |

## 试一下

```bash
npm run s05
npm run s05 -- "帮我生成这个项目的 release notes"
```

观察：模型先 `read` 了 `SKILL.md`，再 `bash` 执行 `scripts/collect.sh`，最后按 skill 规定的分类格式输出。整个过程 system prompt 里只多了两行 —— 名字和描述。

试试反例：`npm run s05 -- "1+1等于几"`。它不会去读 skill，因为 description 不匹配。

## 本章要点

- Skill = 渐进披露的领域知识：常驻的只有 name + description。
- `description` 决定命中率，写成「做什么 + 什么时候用」。
- 正文可以引用脚本、参考文档、模板，按相对路径解析。
- 加载方式三选一：目录自动发现、CLI `--skill`、SDK `skillsOverride`。

## 下一章

Skill 由模型触发。有些指令你想由**用户**一键触发。**s06：Prompt 模板**。
