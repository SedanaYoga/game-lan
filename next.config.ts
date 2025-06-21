import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  basePath: process.env.CI ? "/game-lan" : "",
};

export default nextConfig;
