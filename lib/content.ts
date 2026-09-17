import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Shared filesystem/frontmatter plumbing behind every MDX content type
// (guides, professions, ...). Each content type keeps its own frontmatter
// shape and its own thin wrapper module (lib/guides.ts, lib/professions.ts)
// -- this only factors out the parts that don't vary: reading a directory
// of *.mdx files by slug and parsing frontmatter out of one.
export function listContentSlugs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function readContentFile<Frontmatter>(
  dir: string,
  slug: string
): { frontmatter: Frontmatter; content: string } | undefined {
  const filePath = path.join(dir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { frontmatter: data as Frontmatter, content };
}
