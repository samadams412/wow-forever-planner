import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Professions Reference";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Professions",
    subtitle: "New recipes, gear, and titles coming to every profession in World of Warcraft: Forever.",
  });
}
