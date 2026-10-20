import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Raid Comp Planner";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Raid Comp Planner",
    subtitle: "Plan a 10, 20 or 40-player raid by spec and see which buffs and debuffs it covers.",
    backgroundImage: "/images/reference/hero.webp",
  });
}
