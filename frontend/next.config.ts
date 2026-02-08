import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure `@/…` resolves in both Webpack (fallback) and Turbopack builds.
  experimental: {
    ...( {
      turbo: {
        resolveAlias: {
          "@": path.resolve(__dirname, "src"),
        },
      },
    } as unknown as object),
  } as NextConfig["experimental"],
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
};

export default nextConfig;
