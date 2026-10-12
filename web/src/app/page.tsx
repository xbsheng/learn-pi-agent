"use client";

import { useEffect } from "react";
import Link from "next/link";

// 根路径的落地页:默认跳转到中文站。
// 它位于 [locale] 布局之外,拿不到 globals.css,所以这里用内联样式,
// 保证任何静态托管上都是同样的观感(不再出现浏览器默认样式的裸页面)。
const css = `
  .lp-root{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.1rem;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
    background:#fff;color:#18181b}
  .lp-logo{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;
    font-size:30px;font-weight:700;color:#fff;background:linear-gradient(135deg,#3b82f6,#6366f1);
    box-shadow:0 8px 24px rgba(59,130,246,.35)}
  .lp-spin{width:22px;height:22px;border-radius:50%;border:2.5px solid #e4e4e7;border-top-color:#3b82f6;
    animation:lp-spin .8s linear infinite}
  @keyframes lp-spin{to{transform:rotate(360deg)}}
  .lp-text{font-size:.875rem;color:#71717a;margin:0}
  .lp-links{display:flex;gap:1.25rem;font-size:.875rem}
  .lp-links a{color:#2563eb;font-weight:500;text-decoration:none}
  .lp-links a:hover{text-decoration:underline}
  @media (prefers-color-scheme:dark){
    .lp-root{background:#09090b;color:#fafafa}
    .lp-text{color:#a1a1aa}
    .lp-spin{border-color:#27272a;border-top-color:#60a5fa}
    .lp-links a{color:#60a5fa}
  }
`;

export default function RootPage() {
  useEffect(() => {
    window.location.replace("/zh/");
  }, []);

  return (
    <div className="lp-root">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* 无 JS 也能立刻跳转(React 19 会把 meta 提升到 head) */}
      <meta httpEquiv="refresh" content="0; url=/zh/" />
      <div className="lp-logo">π</div>
      <div className="lp-spin" aria-hidden="true" />
      <p className="lp-text">正在进入中文站… / Redirecting…</p>
      <div className="lp-links">
        <Link href="/zh/">中文</Link>
        <Link href="/en/">English</Link>
      </div>
    </div>
  );
}
