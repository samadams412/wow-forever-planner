import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/planner/og/"],
        // High-cardinality URLs with no unique content, each a crawl request
        // (and for the catalogs a server render): catalog filter/sort/page
        // combinations, ?from= back-link variants of item and quest pages
        // (items are listed in the sitemap without it), and shared-build
        // planner URLs (canonical /planner). /planner/og/ stays allowed so
        // link previews (X checks robots.txt) can fetch build images.
        disallow: ["/reference/items?", "/reference/quests?", "/items/*?", "/quests/*?", "/planner/*/"],
      },
      {
        // AI-training crawlers, plus MJ12bot and Amazonbot: heavy crawl
        // volume (2026-10-19 audit) with no search value for this site.
        userAgent: ["GPTBot", "ClaudeBot", "CCBot", "Bytespider", "MJ12bot", "Amazonbot"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
