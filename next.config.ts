import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.STANDALONE === "true" ? { output: "standalone" } : {}),
  serverExternalPackages: ["bcryptjs"],
  allowedDevOrigins: ["*"],
  devIndicators: false,
};

export default nextConfig;
