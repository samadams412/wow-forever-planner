import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Crafting Calculator";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Crafting Calculator",
    subtitle: "Plan a craft and see every material you need across professions.",
    backgroundImage: "/images/reference/hero.webp",
  });
}
