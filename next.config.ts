import type { NextConfig } from "next";

// For development mode
const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Only use export for production builds
  ...(isDev ? {} : { output: 'export' }),
  // Only use basePath for production
  ...(isDev ? {} : { basePath: '/trading-guide' }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
