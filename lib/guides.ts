import fs from "fs";
import path from "path";
import matter from "gray-matter";

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

function readGuideFile(slug: string): { frontmatter: GuideFrontmatter; content: string } | undefined {
  const filePath = path.join(GUIDES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { frontmatter: data as GuideFrontmatter, content };
}

export function getAllGuides(): GuideMeta[] {
  if (!fs.existsSync(GUIDES_DIR)) return [];
  return fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, "");
      const file = readGuideFile(slug);
      return file ? { slug, ...file.frontmatter } : undefined;
    })
    .filter((g): g is GuideMeta => g !== undefined && g.status === "published")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getGuide(slug: string): { frontmatter: GuideFrontmatter; content: string } | undefined {
  const file = readGuideFile(slug);
  if (!file || file.frontmatter.status !== "published") return undefined;
  return file;
}
