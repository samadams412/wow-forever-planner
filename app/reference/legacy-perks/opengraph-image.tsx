import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Legacy System Perks & Rewards Reference";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Legacy Perks",
    subtitle: "Account-wide perks across the Adventure, Resourcefulness, and Professions trees.",
  });
}
