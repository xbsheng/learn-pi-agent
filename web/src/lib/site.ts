// 站点绝对地址。部署时用环境变量 NEXT_PUBLIC_SITE_URL 覆盖成你的域名。
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://learn-pi-agent.vercel.app";

export const LOCALES = ["zh", "en"] as const;
