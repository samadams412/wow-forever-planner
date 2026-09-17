import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Blog";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Blog",
    subtitle: "Dated posts on beta impressions, patch breakdowns, and updates.",
    backgroundImage: "/images/blog/hero.webp",
  });
}
