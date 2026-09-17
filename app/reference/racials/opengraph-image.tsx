import { renderOgImage, OG_SIZE } from "@/lib/og-template";

export const runtime = "nodejs";
export const alt = "Forevercraft Race & Racial Ability Reference";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage({
    title: "Racials",
    subtitle: "Every race's allowed classes and racial abilities, Horde and Alliance side by side.",
  });
}
