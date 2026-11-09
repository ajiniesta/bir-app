import type { NextConfig } from "next";

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/login",
        destination: `${apiBaseUrl}/login`,
      },
      {
        source: "/api/auth/register",
        destination: `${apiBaseUrl}/api/auth/register`,
      },
      {
        source: "/api/:path((?!auth/).*)",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
