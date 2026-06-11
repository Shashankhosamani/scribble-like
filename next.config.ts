import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['172.16.10.140', '172.16.10.217'],
};

export default nextConfig;
