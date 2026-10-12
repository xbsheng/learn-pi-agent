[English](README.en.md) | 中文

# Learn Pi Agent — 真正的 Agent Harness 工程

> 参照 [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 的课程结构，用 [pi](https://pi.dev) 讲同一件事：**Agency 来自模型，Harness 来自你。**

## 一句话

**Agent = 模型 + Harness。**

模型（Claude、GPT、Qwen……）在训练中学会了感知、推理、行动。Harness 是它栖居的世界：工具、知识、观察、动作、边界。你写的不是智能，你写的是智能的房间。

pi 把这个房间提前搭好了一半：一个 agent 循环、四个内置工具（`read`/`write`/`edit`/`bash`）、会话与压缩、子进程集成。pi 的哲学是 **小核心 + 扩展**——它甚至不内置 sub agent 和 plan mode，而是把扩展点留给你。

所以这套教程和 learn-claude-code 的关键区别只有一句：

> **learn-claude-code 教你从零写出循环；learn-pi-agent 教你把自己的机制挂到 pi 的循环上。**

循环不用你写，但 harness 的每一块砖都是你的：自定义工具、权限闸门、事件钩子、按需技能、提示词模板、会话分支、子 agent、RPC 集成、自定义模型、可分发的 Pi Package。

## 课程地图

| 章节 | 机制 | 一句话格言 |
|---|---|---|
| [s01](s01_agent_session/) | AgentSession | *pi 已经转着循环，你只需要接上* |
| [s02](s02_custom_tools/) | 自定义工具 | *加一个能力，只加一个 handler* |
| [s03](s03_permission_gate/) | 权限闸门 | *先划边界，再给自由* |
| [s04](s04_events_and_ui/) | 事件与钩子 | *挂在循环上，不写进循环里* |
| [s05](s05_skills/) | Skill 按需加载 | *用到时再加载，别全塞 prompt* |
| [s06](s06_prompt_templates/) | Prompt 模板 | *常用指令，一条斜杠命令展开* |
| [s07](s07_sessions/) | 会话与分支 | *上下文会满，要能存、能分叉* |
| [s08](s08_subagents/) | 子 Agent | *给子任务一份全新的 messages[]* |
| [s09](s09_rpc/) | RPC 集成 | *用 JSONL 把 pi 接进任何程序* |
| [s10](s10_custom_provider/) | 自定义 Provider | *模型不止一家，接上自己的* |
| [s11](s11_pi_packages/) | Pi Package | *打包你的工具、技能、模板，分享出去* |
| [s12](s12_full_harness/) | 完整 Harness | *多种机制，一个会话* |

## 核心模式

从零写一个 agent loop 大概只要 30 行，在 pi 内部它是这样转的：

```
User --> messages[] --> LLM --> response
                                  |
                          有 tool_use block?
                       /                        \
                     yes                         no
                      |                           |
               执行工具                     返回文本
               追加结果
               回到 LLM <---------------------+
```

pi 用 TypeScript 实现了它，并且在你调用的那一刻就已经在运行了：

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({ sessionManager: SessionManager.inMemory() });

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("看看当前目录，告诉我这是什么项目");
```

这两段代码等价：一个是循环本体，一个是循环的入口。**后面的每一章都在这个入口上加一个 harness 机制，循环本身始终不改。**

## 快速开始

要求 **Node.js 24+**（直接运行 `.ts` 依赖 Node 的类型剥离能力，无需编译）。

```bash
cd learn-pi-agent
npm install

# 认证：用 pi 现有登录态，或设 API key
#   pi /login
#   export ANTHROPIC_API_KEY=sk-ant-...

npm run s01        # 起点：一次最简会话
npm run s12        # 终点：多种机制集成
npm test           # 权限策略与待办存储的单元测试（不需要网络/API）
```

每章目录结构：

```
sNN_xxx/
├── README.md      # 概念 + 逐步拆解 + 试一下
├── code.ts        # 可运行示例
└── ...            # 该章用到的资源（extension / skill / prompt / package）
```

## 心法

- **工具原子化、可组合、描述清晰。** 每个工具都是 agent 在环境里能采取的一个动作。
- **知识按需加载。** Skill 只在 description 命中时展开，不预先占满上下文。
- **边界先于自由。** 破坏性操作先过 `tool_call` 闸门，再交给模型执行。
- **挂在循环上，别改循环。** 观察用事件，干预用钩子，扩展用工具。pi 的核心永远不用 fork。
- **上下文是有限资源。** 会话持久化、分支、压缩、子 agent，本质都是在管理它。

## 与 learn-claude-code 的对应

> 没读过 [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 完全不影响本教程。
> 下面这张表只是给想对照「从零手写」和「挂在 pi 上」两种路径的读者。

| learn-claude-code | learn-pi-agent |
|---|---|
| 手写 agent loop（Python） | `createAgentSession()`（pi 已实现） |
| 手写 TOOLS 数组 | `defineTool()` / `pi.registerTool()` |
| 手写危险命令检查 | `tool_call` 钩子 |
| 手写 todo / subagent | `defineTool()` 里派生新 session |
| 手写 skill 加载 | Agent Skills 标准 + `DefaultResourceLoader` |
| 手写 context compact | `session.compact()` + 自动压缩 |
| 手写 task/team/worktree | 会话树 + Pi Package + RPC |

**Bash is all you need。扩展点才是 harness 工程师的全部。**

## 教程网站

仓库里的 `web/` 是配套教程站,样式参照 [learn.shareai.run](https://learn.shareai.run/zh/s01/) (Next.js + Tailwind 4 静态导出)。
章节正文直接来自各目录的 `README.md`(中文) 与 `README.en.md`(English),由 `web/scripts/extract-content.ts` 抽取。
站点默认中文(`/zh/`),英文在 `/en/`。

```bash
cd web
npm install
npm run dev     # http://localhost:3000 → /zh/
npm run build   # 静态导出到 web/out
```

部署:`.github/workflows/deploy-vercel.yml` 在 push 到 `main` 时用 Vercel CLI 发布到生产。
需要在 Vercel 建好项目(Root Directory 设为 `web`),并在仓库 secrets 配置
`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`;
再在 Vercel 环境变量里设 `NEXT_PUBLIC_SITE_URL` 为正式域名(sitemap / canonical 用)。

## 许可

教程文本 CC BY 4.0，代码 MIT。
