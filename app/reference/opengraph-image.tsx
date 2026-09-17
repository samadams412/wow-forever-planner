import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Reference";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Reference",
    subtitle: "Race & class rules, racials, and deep dives for World of Warcraft: Forever.",
    backgroundImage: "/images/reference/hero.webp",
  });
}
