import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    config.resolve.alias["@/lib/*"] = path.resolve(__dirname, "src/lib/*");
    return config;
  },
};

export default nextConfig;
