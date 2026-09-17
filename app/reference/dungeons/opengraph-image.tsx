import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Dungeon Level Ranges";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Dungeon Level Ranges",
    subtitle: "Every dungeon, one level-range timeline.",
  });
}
