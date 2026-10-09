import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Safety net: no function should ever read map tiles off disk -- the CDN
  // serves them directly. (Only tiles/, not meta.json/zones.json/
  // zone-areas.json/subzone-grid.bin: lib/map-continents.ts and
  // lib/zone-areas.ts read those, ~200KB per continent.)
  outputFileTracingExcludes: {
    "/*": ["./public/map/*/tiles/**"],
    // /quests/[questId] is fully static (generateStaticParams +
    // dynamicParams = false in lib/quest-detail.ts's only caller), so it
    // never reads this directory at request time -- but Next's tracer
    // matches the path.join(..., `${id}.json`) pattern statically and
    // bundles all 5,000+ shards into the function anyway without this.
    // The key is a glob, and "[questId]" would be parsed as a character
    // class rather than literal text, so it has to be a wildcard here.
    "/quests/*": ["./data/quests/detail/**"],
  },
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
