import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/guides/dungeons",
        destination: "/reference/dungeons",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wow.zamimg.com',
        pathname: '/images/wow/icons/**',
      },
    ],
  },
};

export default nextConfig;
