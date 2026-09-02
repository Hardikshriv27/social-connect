import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  allowedDevOrigins: ["*.ngrok-free.dev"],
};

export default nextConfig;
