import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
