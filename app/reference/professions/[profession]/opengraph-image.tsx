import { renderOgImage, OG_SIZE } from "@/lib/og-template";
import { getProfessionCatalog, getProfessionIds } from "@/lib/profession-recipes";
import { getGatheringCatalog, isGatheringProfessionId, GATHERING_PROFESSION_IDS } from "@/lib/gathering-professions";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return [...getProfessionIds(), ...GATHERING_PROFESSION_IDS].map((profession) => ({ profession }));
}

export default async function Image({ params }: { params: Promise<{ profession: string }> }) {
  const { profession } = await params;

  if (isGatheringProfessionId(profession)) {
    const catalog = getGatheringCatalog(profession);
    return renderOgImage({
      title: catalog?.name ?? "Profession",
      subtitle: catalog ? `Gathering in World of Warcraft: Forever` : undefined,
    });
  }

  const catalog = getProfessionCatalog(profession);
  return renderOgImage({
    title: catalog?.name ?? "Profession",
    subtitle: catalog ? `${catalog.recipes.length} recipes in World of Warcraft: Forever` : undefined,
  });
}
