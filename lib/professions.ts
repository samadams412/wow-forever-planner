import path from "path";
import { listContentSlugs, readContentFile } from "@/lib/content";

const PROFESSIONS_DIR = path.join(process.cwd(), "content", "professions");

// No `tags` field here, unlike GuideFrontmatter -- each page already covers
// exactly one profession (the slug says which), so there's nothing for
// cross-cutting tags to filter or group by the way guide tags do.
export type ProfessionFrontmatter = {
  title: string;
  date: string;
  summary: string;
  status: "draft" | "published";
  heroImage: string;
  heroAlt: string;
  iconUrl?: string;
};

export type ProfessionMeta = ProfessionFrontmatter & { slug: string };

export function getAllProfessions(): ProfessionMeta[] {
  return listContentSlugs(PROFESSIONS_DIR)
    .map((slug) => {
      const file = readContentFile<ProfessionFrontmatter>(PROFESSIONS_DIR, slug);
      return file ? { slug, ...file.frontmatter } : undefined;
    })
    .filter((p): p is ProfessionMeta => p !== undefined && p.status === "published")
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getProfession(slug: string): { frontmatter: ProfessionFrontmatter; content: string } | undefined {
  const file = readContentFile<ProfessionFrontmatter>(PROFESSIONS_DIR, slug);
  if (!file || file.frontmatter.status !== "published") return undefined;
  return file;
}
