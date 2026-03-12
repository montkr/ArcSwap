import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ArcSwap",
  images: { unoptimized: true },
};

export default nextConfig;
