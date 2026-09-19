import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Class Spellbooks Reference";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Class Spellbooks",
    subtitle: "Every class's level-38 spellbook, read frame by frame from the BlizzCon 2026 demo.",
  });
}
