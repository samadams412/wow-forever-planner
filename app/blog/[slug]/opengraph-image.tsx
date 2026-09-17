import { renderOgImage, OG_SIZE } from "@/lib/og-template";
import { getAllPosts, getPost } from "@/lib/blog";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);

  return renderOgImage({
    title: post?.frontmatter.title ?? "Blog",
    subtitle: post?.frontmatter.summary,
    backgroundImage: post?.frontmatter.heroImage,
  });
}
