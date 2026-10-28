import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "WoW Forever Beta Wrapped";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Beta Wrapped",
    subtitle: "Every change Blizzard made in the WoW: Forever beta, Sept 16 to Oct 27.",
    backgroundImage: "/images/hero/homepage-hero.webp",
  });
}
