import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["bcryptjs"],
  allowedDevOrigins: ["*"],
  devIndicators: false,
};

export default nextConfig;
