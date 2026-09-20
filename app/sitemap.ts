import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";
import { getAllGuides } from "@/lib/guides";
import { getAllProfessions } from "@/lib/professions";

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

  // 4. Dynamic profession pages
  const professions = getAllProfessions();
  const professionEntries = professions.map((profession) => ({
    url: `${SITE_URL}/reference/professions/${profession.slug}`,
    lastModified: profession.date ? new Date(profession.date) : new Date(),
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