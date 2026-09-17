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
};

export default nextConfig;
