import { renderOgImage, OG_SIZE } from "@/lib/og-template";
import { getAllProfessions, getProfession } from "@/lib/professions";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllProfessions().map((profession) => ({ slug: profession.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profession = getProfession(slug);

  return renderOgImage({
    title: profession?.frontmatter.title ?? "Profession",
    subtitle: profession?.frontmatter.summary,
    backgroundImage: profession?.frontmatter.heroImage,
  });
}
