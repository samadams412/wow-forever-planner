import path from "path";
import { listContentSlugs, readContentFile } from "@/lib/content";

const GUIDES_DIR = path.join(process.cwd(), "content", "guides");

export type GuideFrontmatter = {
  title: string;
  date: string;
  summary: string;
  tags: string[];
  status: "draft" | "published";
  heroImage: string;
  heroAlt: string;
};

export type GuideMeta = GuideFrontmatter & { slug: string };

export function getAllGuides(): GuideMeta[] {
  return listContentSlugs(GUIDES_DIR)
    .map((slug) => {
      const file = readContentFile<GuideFrontmatter>(GUIDES_DIR, slug);
      return file ? { slug, ...file.frontmatter } : undefined;
    })
    .filter((g): g is GuideMeta => g !== undefined && g.status === "published")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getGuide(slug: string): { frontmatter: GuideFrontmatter; content: string } | undefined {
  const file = readContentFile<GuideFrontmatter>(GUIDES_DIR, slug);
  if (!file || file.frontmatter.status !== "published") return undefined;
  return file;
}
