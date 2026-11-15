import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The first dark screens were replaced: their addresses lead to the screens that took their place.
  async redirects() {
    return [
      { source: '/play', has: [{ type: 'query', key: 'daily' }], destination: '/daily', permanent: false },
      { source: '/play', destination: '/start', permanent: false },
      { source: '/dashboard', destination: '/today', permanent: false },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
