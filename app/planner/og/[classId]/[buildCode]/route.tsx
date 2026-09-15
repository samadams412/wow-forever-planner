import { ImageResponse } from "next/og";
import fs from "fs/promises";
import path from "path";
import { getClassTalentData, CLASS_ICON, CLASS_COLOR, classLabel, iconUrl } from "@/lib/wow-data";
import { decodeBuild } from "@/lib/build-code";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

// Not a file-convention opengraph-image.tsx: Next.js requires a catch-all
// segment ([[...slug]] on the planner page) to be the last part of its
// route, so a metadata-image file can't live inside app/planner/[[...slug]]/
// itself. This is a plain Route Handler at a sibling static path instead --
// app/planner/og/... wins routing priority over the [[...slug]] catch-all
// for anything under /planner/og/*, same as any static segment would.
// The planner page's generateMetadata points openGraph.images here when a
// real build is present, and omits it (falling back to the site-wide
// static image) otherwise.
async function genericSiteImage() {
  const bytes = await fs.readFile(path.join(process.cwd(), "public/images/og/opengraph.png"));
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png" } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string; buildCode: string }> }
) {
  const { classId, buildCode } = await params;

  const classData = getClassTalentData(classId);
  if (!classData || !buildCode) return genericSiteImage();

  const ranks = decodeBuild(classData, buildCode);
  const perTree = classData.trees.map((tree) =>
    tree.talents.reduce((sum, t) => sum + (ranks[t.id] ?? 0), 0)
  );
  const totalPoints = perTree.reduce((a, b) => a + b, 0);
  if (totalPoints === 0) return genericSiteImage();

  const color = CLASS_COLOR[classId] ?? "#c9a961";
  const label = classLabel(classId);
  const iconSrc = iconUrl(CLASS_ICON[classId] ?? "inv_misc_questionmark");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0d0b07",
          fontFamily: "sans-serif",
        }}
      >
        {/* Class-colored accent line standing in for a per-class border. */}
        <div style={{ display: "flex", height: 14, width: "100%", backgroundColor: color }} />

        <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "0 80px", gap: 56 }}>
          <img
            src={iconSrc}
            width={240}
            height={240}
            style={{ borderRadius: 28, border: `6px solid ${color}` }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                textTransform: "uppercase",
                letterSpacing: 6,
                color: "#c9a961",
              }}
            >
              WoW Forever Talent Build
            </div>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "#e8dcc4", marginTop: 8 }}>
              {label}
            </div>
            <div style={{ display: "flex", fontSize: 40, color, marginTop: 16, letterSpacing: 2 }}>
              {perTree.join(" / ")}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "28px 80px",
            borderTop: "1px solid #3d3420",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 34,
              width: 34,
              borderRadius: 8,
              border: "2px solid #c9a961",
              color: "#c9a961",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#c9a961", letterSpacing: 1 }}>
            Forevercraft
          </div>
        </div>
      </div>
    ),
    SIZE
  );
}
