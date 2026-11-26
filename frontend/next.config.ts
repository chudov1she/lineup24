import type { NextConfig } from "next";

/** Nest upstream for /api rewrites (Docker service name or host). */
const API_PROXY_TARGET = (
  process.env.API_PROXY_TARGET || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/information_about_delivery',
        destination: '/dogovor',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // Same-origin /api → Nest. One ngrok tunnel to :3000 is enough.
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
      {
        source: '/docs',
        destination: `${API_PROXY_TARGET}/docs`,
      },
      {
        source: '/docs-json',
        destination: `${API_PROXY_TARGET}/docs-json`,
      },
    ];
  },
  output: 'standalone',
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
