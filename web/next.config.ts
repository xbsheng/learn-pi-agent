import type { NextConfig } from "next";

// 仓库根目录也有 lockfile,显式指定 Turbopack 的根,避免误判 workspace root。
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: { root: __dirname },
};

export default nextConfig;
