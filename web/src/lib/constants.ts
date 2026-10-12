import type { AgentLayer } from "@/types/agent-data";

export const VERSION_ORDER = [
  "s01",
  "s02",
  "s03",
  "s04",
  "s05",
  "s06",
  "s07",
  "s08",
  "s09",
  "s10",
  "s11",
  "s12",
] as const;

export const LEARNING_PATH = VERSION_ORDER;

export type VersionId = (typeof LEARNING_PATH)[number];

export const VERSION_META: Record<
  string,
  {
    title: string;
    subtitle: string;
    coreAddition: string;
    keyInsight: string;
    layer: AgentLayer;
    prevVersion: string | null;
  }
> = {
  s01: {
    title: "AgentSession",
    subtitle: "pi 已经转着循环",
    coreAddition: "内置 agent 循环",
    keyInsight: "一个 prompt() 就是一整个 agent loop，pi 已经替你转好了。",
    layer: "loop",
    prevVersion: null,
  },
  s02: {
    title: "自定义工具",
    subtitle: "加一个能力，只加一个 handler",
    coreAddition: "defineTool 工具池",
    keyInsight: "加一个能力，只加一个 handler。",
    layer: "loop",
    prevVersion: "s01",
  },
  s03: {
    title: "权限闸门",
    subtitle: "先划边界，再给自由",
    coreAddition: "tool_call 权限闸门",
    keyInsight: "先划边界，再给自由。",
    layer: "loop",
    prevVersion: "s02",
  },
  s04: {
    title: "事件与钩子",
    subtitle: "挂在循环上，不写进循环里",
    coreAddition: "事件订阅与钩子",
    keyInsight: "观察用事件，干预用钩子，主循环永远不改。",
    layer: "loop",
    prevVersion: "s03",
  },
  s05: {
    title: "Skill 按需加载",
    subtitle: "用到时再加载，别全塞 prompt",
    coreAddition: "Agent Skills 按需加载",
    keyInsight: "系统提示里只有名字和描述，正文等命中再读。",
    layer: "knowledge",
    prevVersion: "s04",
  },
  s06: {
    title: "Prompt 模板",
    subtitle: "常用指令，一条斜杠命令展开",
    coreAddition: "Prompt 模板",
    keyInsight: "把「怎么问」也标准化。",
    layer: "knowledge",
    prevVersion: "s05",
  },
  s07: {
    title: "会话与分支",
    subtitle: "上下文会满，要能存、能分叉",
    coreAddition: "会话树与压缩",
    keyInsight: "会话是树，不是一条直线。",
    layer: "knowledge",
    prevVersion: "s06",
  },
  s08: {
    title: "子 Agent",
    subtitle: "给子任务一份全新的 messages[]",
    coreAddition: "隔离子会话",
    keyInsight: "用上下文预算换取专注度。",
    layer: "delegate",
    prevVersion: "s07",
  },
  s09: {
    title: "RPC 集成",
    subtitle: "用 JSONL 把 pi 接进任何程序",
    coreAddition: "JSONL RPC",
    keyInsight: "stdin 发命令，stdout 收事件。",
    layer: "delegate",
    prevVersion: "s08",
  },
  s10: {
    title: "自定义 Provider",
    subtitle: "模型不止一家，接上自己的",
    coreAddition: "自定义模型 Provider",
    keyInsight: "pi 的模型层是开放的。",
    layer: "delegate",
    prevVersion: "s09",
  },
  s11: {
    title: "Pi Package",
    subtitle: "打包你的工具、技能、模板，分享出去",
    coreAddition: "Pi Package 分发",
    keyInsight: "一个单元，一次安装。",
    layer: "distribute",
    prevVersion: "s10",
  },
  s12: {
    title: "完整 Harness",
    subtitle: "多种机制，一个会话",
    coreAddition: "机制集成",
    keyInsight: "所有扩展点最终都汇入同一条循环。",
    layer: "distribute",
    prevVersion: "s11",
  },
};

export const LAYERS = [
  {
    id: "loop" as const,
    label: "循环与行动",
    labelEn: "Loop & Action",
    color: "#3B82F6",
    versions: ["s01", "s02", "s03", "s04"],
  },
  {
    id: "knowledge" as const,
    label: "知识与上下文",
    labelEn: "Knowledge & Context",
    color: "#10B981",
    versions: ["s05", "s06", "s07"],
  },
  {
    id: "delegate" as const,
    label: "委派与集成",
    labelEn: "Delegation & Integration",
    color: "#8B5CF6",
    versions: ["s08", "s09", "s10"],
  },
  {
    id: "distribute" as const,
    label: "分发与综合",
    labelEn: "Distribution & Integration",
    color: "#F59E0B",
    versions: ["s11", "s12"],
  },
] as const;

// 英文站点的章节元数据（只覆盖随语言变化的字段，layer/prevVersion 沿用 VERSION_META）。
const VERSION_META_EN: Record<
  string,
  { title: string; subtitle: string; coreAddition: string; keyInsight: string }
> = {
  s01: {
    title: "AgentSession",
    subtitle: "pi already runs the loop",
    coreAddition: "Built-in agent loop",
    keyInsight: "One prompt() is a whole agent loop; pi already turns it for you.",
  },
  s02: {
    title: "Custom tools",
    subtitle: "Add a capability, add one handler",
    coreAddition: "defineTool tool pool",
    keyInsight: "Add a capability, add just one handler.",
  },
  s03: {
    title: "Permission gate",
    subtitle: "Draw the boundary first, then hand over freedom",
    coreAddition: "tool_call permission gate",
    keyInsight: "Draw the boundary first, then hand over freedom.",
  },
  s04: {
    title: "Events and hooks",
    subtitle: "Hang on the loop, do not write into it",
    coreAddition: "Events and hooks",
    keyInsight: "Observe with events, intervene with hooks, never touch the main loop.",
  },
  s05: {
    title: "On-demand skills",
    subtitle: "Load it when you need it",
    coreAddition: "Agent Skills on demand",
    keyInsight: "Only names and descriptions are resident; the body is read on a hit.",
  },
  s06: {
    title: "Prompt templates",
    subtitle: "A slash command for a common instruction",
    coreAddition: "Prompt templates",
    keyInsight: "Standardize how to ask, too.",
  },
  s07: {
    title: "Sessions and branching",
    subtitle: "Context fills up; save and fork it",
    coreAddition: "Session tree and compaction",
    keyInsight: "A session is a tree, not a straight line.",
  },
  s08: {
    title: "Subagents",
    subtitle: "Give a subtask a brand-new messages[]",
    coreAddition: "Isolated child session",
    keyInsight: "Trade context budget for focus.",
  },
  s09: {
    title: "RPC integration",
    subtitle: "Drive pi from any program with JSONL",
    coreAddition: "JSONL RPC",
    keyInsight: "Commands in on stdin, events out on stdout.",
  },
  s10: {
    title: "Custom providers",
    subtitle: "The model is not only from one vendor",
    coreAddition: "Custom model provider",
    keyInsight: "pi's model layer is open.",
  },
  s11: {
    title: "Pi Package",
    subtitle: "Pack your tools, skills, and templates and share them",
    coreAddition: "Pi Package distribution",
    keyInsight: "One unit, one install.",
  },
  s12: {
    title: "The full harness",
    subtitle: "Many mechanisms, one session",
    coreAddition: "Mechanism integration",
    keyInsight: "Every extension point ultimately flows into the same loop.",
  },
};

export function getVersionMeta(id: string, locale: string) {
  const base = VERSION_META[id];
  if (!base) return undefined;
  const en = VERSION_META_EN[id];
  return locale === "en" && en ? { ...base, ...en } : base;
}

export function getLayerLabel(layer: { label: string; labelEn: string }, locale: string) {
  return locale === "en" ? layer.labelEn : layer.label;
}
