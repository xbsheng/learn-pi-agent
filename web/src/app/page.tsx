"use client";

import { useEffect } from "react";
import Link from "next/link";

// 静态导出下 Server Component 的 redirect() 不可用，改成客户端跳转 + 兜底链接。
// 默认中文。
export default function RootPage() {
  useEffect(() => {
    window.location.replace("/zh/");
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <p className="text-sm text-zinc-500">Redirecting…</p>
      <div className="flex gap-4 text-sm">
        <Link href="/zh/" className="font-medium underline">
          中文
        </Link>
        <Link href="/en/" className="font-medium underline">
          English
        </Link>
      </div>
    </div>
  );
}
