import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";
import { getAllGuides } from "@/lib/guides";
import { PROFESSION_IDS } from "@/lib/profession-recipes";
import { GATHERING_PROFESSION_IDS } from "@/lib/gathering-professions";

const STATIC_ROUTES = [
  "",
  "/planner",
  "/reference",
  "/reference/racials",
  "/reference/legacy-perks",
  "/reference/class-spellbooks",
  "/reference/dungeons",
  "/reference/professions",
  "/guides",
  "/blog",
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

  return [
    ...staticEntries,
    ...guideEntries,
    ...blogEntries,
    ...professionEntries,
  ];
}