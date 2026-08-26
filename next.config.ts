import { NextConfig } from "next/dist/server/config";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  experimental: {
    optimizePackageImports: ["@heroui/react"],
    prefetchInlining: true,
  },
};

export default nextConfig;
