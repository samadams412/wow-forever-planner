import { ImageResponse } from "next/og";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

// Shared visual template for every route's Open Graph image, styled to
// match the site-wide static public/images/og/opengraph.png: gold hexagon
// mark, Cinzel Bold title, EB Garamond italic subtitle, a gold rule, and a
// "FOREVERCRAFT.APP" footer over a dark-scrimmed background photo.

export const OG_SIZE = { width: 1200, height: 630 };

const GOLD = "#c9a961";
const CREAM = "#e8dcc4";
const DARK = "#0d0b07";

// Used whenever a route doesn't have its own background image, or its own
// image is missing on disk (e.g. a profession page whose hero.webp hasn't
// been supplied yet) -- same photo the homepage hero uses.
const FALLBACK_BACKGROUND = "/images/hero/homepage-hero.webp";

// Fonts don't depend on request data, so read them once at module scope
// (see https://nextjs.org/docs/app/getting-started/caching#predictable-values).
// The subtitle used to render in EBGaramond-Italic -- legible in a browser
// at body-text sizes, but a thin italic serif at 30px on a photo background
// read poorly once actually rendered as a flat OG-card image (checked live:
// /reference/dungeons's "Every dungeon, one level-range timeline." was
// noticeably harder to read than the bold Cinzel title above it). Switched
// to the upright EBGaramond-Regular -- already pulled into assets/fonts/
// for exactly this future use, per its own header comment -- since upright
// glyphs have more vertical stroke weight than an italic cut of the same
// face and read faster at a glance; the title's Cinzel Bold treatment is
// untouched.
const [cinzelBold, ebGaramondRegular] = await Promise.all([
  fs.readFile(path.join(process.cwd(), "assets/fonts/Cinzel-Bold.ttf")),
  fs.readFile(path.join(process.cwd(), "assets/fonts/EBGaramond-Regular.ttf")),
]);

// The gold talent-tree hexagon mark (same artwork as
// public/images/logo/gold-talent-tree-transparent.svg), embedded as path
// data directly rather than read from disk, and rendered via a data-URI
// <img> since satori's inline <svg> support is unreliable for nested
// shapes.
const HEXAGON_MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
    `<path fill="${DARK}" stroke="${GOLD}" stroke-width="4.5" stroke-linejoin="round" d="M32 4l24.2 14v28l-24.2 14-24.2-14V18z"/>` +
    `<g fill="none" stroke="${CREAM}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M32 47V25"/><path d="M32 33l-8.5-7"/><path d="M32 33l8.5-7"/>` +
    `</g>` +
    `<g fill="${CREAM}">` +
    `<circle cx="32" cy="21.5" r="3.6"/><circle cx="22" cy="23.5" r="3.6"/><circle cx="42" cy="23.5" r="3.6"/>` +
    `<rect x="24" y="45" width="16" height="5" rx="2.5"/>` +
    `</g>` +
    `</svg>`
).toString("base64")}`;

function titleFontSize(title: string): number {
  if (title.length > 45) return 42;
  if (title.length > 24) return 56;
  return 72;
}

async function readPublicImageAsDataUri(publicPath: string): Promise<string> {
  const bytes = await fs.readFile(path.join(process.cwd(), "public", publicPath));

  // Every source image is re-encoded through sharp before embedding, for
  // two reasons found by testing directly against this renderer:
  // 1. satori (next/og's renderer) can't decode WebP from a data URI --
  //    it crashes the response pipe with an opaque "u2 is not iterable"
  //    error, while the identical layout with a JPEG/PNG source works.
  // 2. A full-resolution source (content/blog's hero.webp is 5+MB) blows
  //    past satori's internal XML buffer limit once base64-inflated --
  //    resizing to OG-card width keeps every background well under that.
  const jpeg = await sharp(bytes)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

async function resolveBackgroundImage(requested?: string): Promise<string> {
  if (requested) {
    try {
      return await readPublicImageAsDataUri(requested);
    } catch {
      // Falls through to the site-wide hero below -- e.g. a content
      // frontmatter's heroImage that doesn't exist on disk yet.
    }
  }
  return readPublicImageAsDataUri(FALLBACK_BACKGROUND);
}

export async function renderOgImage({
  title,
  subtitle,
  backgroundImage,
}: {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
}) {
  const bgDataUri = await resolveBackgroundImage(backgroundImage);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: DARK,
        }}
      >
        <img
          src={bgDataUri}
          alt=""
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Vertical darkening toward the bottom, where the text sits. */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(to bottom, rgba(13,11,7,0.12) 0%, rgba(13,11,7,0.4) 45%, rgba(13,11,7,0.92) 100%)",
          }}
        />
        {/* Horizontal darkening behind the left-aligned text block. */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(100deg, rgba(13,11,7,0.85) 0%, rgba(13,11,7,0.55) 42%, rgba(13,11,7,0.1) 75%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
            padding: "0 84px 66px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <img src={HEXAGON_MARK_DATA_URI} alt="" width={92} height={92} />
            <div
              style={{
                display: "flex",
                fontFamily: "Cinzel",
                fontWeight: 700,
                fontSize: titleFontSize(title),
                color: GOLD,
                textTransform: "uppercase",
                letterSpacing: 2,
                lineHeight: 1.15,
                maxWidth: 900,
              }}
            >
              {title}
            </div>
          </div>

          {subtitle && (
            <div
              style={{
                display: "flex",
                fontFamily: "EB Garamond",
                fontStyle: "normal",
                fontSize: 32,
                color: "#f5efe0",
                marginTop: 20,
                maxWidth: 760,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          )}

          <div style={{ display: "flex", width: 340, height: 2, backgroundColor: GOLD, opacity: 0.8, marginTop: 26 }} />

          <div
            style={{
              display: "flex",
              fontFamily: "Cinzel",
              fontWeight: 700,
              fontSize: 24,
              color: GOLD,
              letterSpacing: 3,
              marginTop: 22,
            }}
          >
            FOREVERCRAFT.APP
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Cinzel", data: cinzelBold, weight: 700, style: "normal" },
        { name: "EB Garamond", data: ebGaramondRegular, weight: 400, style: "normal" },
      ],
    }
  );
}
