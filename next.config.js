/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/trading-guide' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/trading-guide/' : '',
  images: {
    unoptimized: true,
  },
  // Optional: Add any other Next.js config options here
};

module.exports = nextConfig;
