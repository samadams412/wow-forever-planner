import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Guides";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Guides",
    subtitle: "Leveling tips, class impressions, and patch coverage for World of Warcraft: Forever.",
    backgroundImage: "/images/guides/hero.webp",
  });
}
