// 每章在 pi 循环里的「介入点」——用于章节页顶部的机制定位图。
export interface MechanismNode {
  id: string;
  zh: string;
  en: string;
}

export interface MechanismInfo {
  // 高亮的循环阶段 id
  active: string[];
  // 包裹整个循环的外部边界（RPC / Package）
  wrap?: { zh: string; en: string };
  note: { zh: string; en: string };
}

export const MECHANISM_NODES: MechanismNode[] = [
  { id: "input", zh: "用户输入", en: "User input" },
  { id: "context", zh: "组装上下文", en: "Build context" },
  { id: "model", zh: "模型推理", en: "Model call" },
  { id: "tool_call", zh: "tool_call 闸门", en: "tool_call gate" },
  { id: "execute", zh: "执行工具", en: "Run tool" },
  { id: "tool_result", zh: "tool_result 回传", en: "tool_result" },
  { id: "session", zh: "会话 / 持久化", en: "Session" },
];

export const MECHANISM_MAP: Record<string, MechanismInfo> = {
  s01: {
    active: ["context", "model", "execute", "tool_result"],
    note: {
      zh: "整条循环由 pi 内置，你只是接上入口。",
      en: "The whole loop is built into pi; you just plug into the entry point.",
    },
  },
  s02: {
    active: ["execute"],
    note: {
      zh: "工具注册进工具池，执行阶段多了一个动作。",
      en: "The tool registers into the pool; the execute stage gains an action.",
    },
  },
  s03: {
    active: ["tool_call"],
    note: {
      zh: "在 tool_call 处拦截，副作用发生之前。",
      en: "Intercept at tool_call, before any side effect happens.",
    },
  },
  s04: {
    active: ["tool_call", "tool_result"],
    note: {
      zh: "用 tool_call / tool_result 钩子包裹执行阶段。",
      en: "Wrap the execute stage with tool_call / tool_result hooks.",
    },
  },
  s05: {
    active: ["context"],
    note: {
      zh: "技能名和描述进 system prompt，正文命中后再读。",
      en: "Skill name and description enter the system prompt; the body is read on a hit.",
    },
  },
  s06: {
    active: ["input"],
    note: {
      zh: "在输入进入循环前，把 /命令 展开成模板正文。",
      en: "Expand the /command into the template body before the input enters the loop.",
    },
  },
  s07: {
    active: ["session"],
    note: {
      zh: "会话在循环之外持久化：可恢复、可分叉、可压缩。",
      en: "The session persists outside the loop: resumable, forkable, compactable.",
    },
  },
  s08: {
    active: ["execute"],
    note: {
      zh: "在 execute 内部新开一个隔离会话，只回传结论。",
      en: "Open an isolated session inside execute and return only the conclusion.",
    },
  },
  s09: {
    active: ["input", "tool_result"],
    wrap: { zh: "RPC 子进程边界（stdin / stdout）", en: "RPC process boundary (stdin / stdout)" },
    note: {
      zh: "RPC 在进程边界之外驱动整条循环。",
      en: "RPC drives the whole loop from outside the process boundary.",
    },
  },
  s10: {
    active: ["model"],
    note: {
      zh: "替换模型接入层，循环其余部分不变。",
      en: "Swap the model access layer; the rest of the loop is unchanged.",
    },
  },
  s11: {
    active: [],
    wrap: { zh: "Pi Package（可安装、可分发）", en: "Pi Package (installable, distributable)" },
    note: {
      zh: "包在循环之外，把前面各章的机制打包分发。",
      en: "Outside the loop: package and distribute the mechanisms from earlier chapters.",
    },
  },
  s12: {
    active: ["input", "context", "model", "tool_call", "execute", "tool_result", "session"],
    note: {
      zh: "六个机制同时挂在同一条循环上，互不冲突。",
      en: "Six mechanisms hang on the same loop at once, with no conflicts.",
    },
  },
};
