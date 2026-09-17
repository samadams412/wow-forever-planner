import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type PostFrontmatter = {
  title: string;
  date: string;
  summary: string;
  tags: string[];
  status: "draft" | "published";
  heroImage: string;
  heroAlt: string;
  heroCredit? : string;
};

export type PostMeta = PostFrontmatter & { slug: string };

function readPostFile(slug: string): { frontmatter: PostFrontmatter; content: string } | undefined {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { frontmatter: data as PostFrontmatter, content };
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, "");
      const file = readPostFile(slug);
      return file ? { slug, ...file.frontmatter } : undefined;
    })
    .filter((p): p is PostMeta => p !== undefined && p.status === "published")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): { frontmatter: PostFrontmatter; content: string } | undefined {
  const file = readPostFile(slug);
  if (!file || file.frontmatter.status !== "published") return undefined;
  return file;
}
