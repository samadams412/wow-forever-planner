import { renderOgImage, OG_SIZE } from "@/lib/og-template";
import { getAllGuides, getGuide } from "@/lib/guides";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);

  return renderOgImage({
    title: guide?.frontmatter.title ?? "Guide",
    subtitle: guide?.frontmatter.summary,
    backgroundImage: guide?.frontmatter.heroImage,
  });
}
