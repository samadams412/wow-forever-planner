import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only meaningful static routes -- the infinite /planner/<class>/<race>/<build>
// permutations have no SEO value on their own (they canonicalize back to
// /planner) and would just dilute crawl budget if listed here.
const ROUTES = [
  "",
  "/planner",
  "/reference",
  "/reference/legacy-perks",
  "/reference/class-spellbooks",
  "/reference/dungeons",
  "/reference/professions",
  "/guides",
  "/blog",
];

export default function sitemap(): MetadataRoute.Sitemap {
  // TODO: once real guide/blog posts exist under /guides/<slug> and
  // /blog/<slug>, add their URLs here (with each post's own lastModified).
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
