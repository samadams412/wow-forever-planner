import { renderOgImage, OG_SIZE } from "@/lib/og-template";
import { getProfessionCatalog, getProfessionIds } from "@/lib/profession-recipes";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getProfessionIds().map((profession) => ({ profession }));
}

export default async function Image({ params }: { params: Promise<{ profession: string }> }) {
  const { profession } = await params;
  const catalog = getProfessionCatalog(profession);

  return renderOgImage({
    title: catalog?.name ?? "Profession",
    subtitle: catalog ? `${catalog.recipes.length} recipes in World of Warcraft: Forever` : undefined,
  });
}
