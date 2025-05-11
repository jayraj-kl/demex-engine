import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "en.wikipedia.org",
        pathname: "/static/favicon/**",
      },
      {
        protocol: "https",
        hostname: "mt.wikipedia.org",
        pathname: "/static/favicon/**",
      },
      {
        protocol: "https",
        hostname: "foundation.wikimedia.org",
        pathname: "/static/favicon/**",
      },
      {
        protocol: "https",
        hostname: "cs.wikipedia.org",
        pathname: "/static/favicon/**",
      },
    ],
  },
};

export default nextConfig;
