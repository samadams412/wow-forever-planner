import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/guides/dungeons",
        destination: "/reference/dungeons",
        permanent: true,
      },
      // No bare /reference/map index page exists (only /reference/map/
      // [continent]) -- redirect the guessable shorter URL to the default
      // continent instead of 404ing, same reasoning as the guides/dungeons
      // redirect above.
      {
        source: "/reference/map",
        destination: "/reference/map/eastern-kingdoms",
        permanent: false,
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
      {
        protocol: 'https',
        hostname: 'foreverchanges.pro',
        pathname: '/wow-ui/dungeons/**',
      },
    ],
  },
};

export default nextConfig;
