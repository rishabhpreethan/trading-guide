import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/trading-guide',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
