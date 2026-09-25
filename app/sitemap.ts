import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";
import { getAllGuides } from "@/lib/guides";
import { PROFESSION_IDS } from "@/lib/profession-recipes";
import { GATHERING_PROFESSION_IDS } from "@/lib/gathering-professions";
import { getDungeonLootIndex } from "@/lib/dungeon-loot";
import { getIndexableItemIds } from "@/lib/items";

const STATIC_ROUTES = [
  "",
  "/planner",
  "/reference",
  "/reference/racials",
  "/reference/legacy-perks",
  "/reference/class-spellbooks",
  "/reference/dungeons",
  "/reference/dungeons/loot",
  "/reference/professions",
  "/reference/items",
  "/guides",
  "/blog",
  "/whats-new",
];

export default function sitemap(): MetadataRoute.Sitemap {
  // 1. Static pages
  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === "" ? "daily" : "weekly") as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: route === "" ? 1.0 : 0.8,
  }));

  // 2. Dynamic guides pages
  const guides = getAllGuides();
  const guideEntries = guides.map((guide) => ({
    url: `${SITE_URL}/guides/${guide.slug}`,
    lastModified: guide.date ? new Date(guide.date) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // 3. Dynamic blog posts pages
  const posts = getAllPosts();
  const blogEntries = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // 4. Profession catalog pages -- recipe data, not dated content, so no
  // per-page lastModified from frontmatter the way guides/blog have.
  // Gathering (Mining/Herbalism/Skinning) share the same URL shape as the
  // 8 crafting professions despite their different page content.
  const professionEntries = [...PROFESSION_IDS, ...GATHERING_PROFESSION_IDS].map((id) => ({
    url: `${SITE_URL}/reference/professions/${id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // 5. Dungeon loot detail pages -- one per dungeon, same 35 ids
  // generateStaticParams on app/reference/dungeons/loot/[slug]/page.tsx
  // builds from.
  const dungeonLootEntries = getDungeonLootIndex().map((d) => ({
    url: `${SITE_URL}/reference/dungeons/loot/${d.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // 6. Individual item pages -- only "new"/"changed" items (9,606 of
  // 21,458), matching the item page's own robots.index rule
  // (isIndexableItemStatus). The other ~11,850 "same"/"missing" items are
  // thin/duplicate-ish content vs. Classic and are noindexed rather than
  // sitemap-listed -- deliberate exclusion, not an oversight (see
  // lib/items.ts's isIndexableItemStatus for the shared reasoning).
  const itemEntries = getIndexableItemIds().map((id) => ({
    url: `${SITE_URL}/items/${id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  return [
    ...staticEntries,
    ...guideEntries,
    ...blogEntries,
    ...professionEntries,
    ...dungeonLootEntries,
    ...itemEntries,
  ];
}