import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Next doesn't infer the repo root
  // (a stray package.json there breaks /app route resolution under Turbopack).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
