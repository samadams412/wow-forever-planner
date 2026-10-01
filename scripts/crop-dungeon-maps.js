// Crops the wow.export dungeon map PNGs in data/dungeons/<folder>/*.png down
// to their real content bounding box, for the three dungeons whose maps were
// extracted via whole-tile exports (map tiles are bigger than the dungeon's
// actual footprint, so the export carries extra padding on one or more
// sides). Outputs to public/maps/dungeons/<slug>/map.png -- a new location,
// separate from the existing BLP-sourced public/images/dungeon-maps/*.webp
// pipeline (scripts/convert-dungeon-maps.js), since this is a different
// source format (raw wow.export PNG, not a decoded BLP) and conversion path.
//
// Crop detection: sample the four corner pixels. If they're mutually close
// (a uniform "no map data" fill color, e.g. wow.export's flat gray), scan
// the full image for the bounding box of pixels that differ from that color
// by more than a threshold, pad it slightly, and crop to that box. If the
// corners are NOT mutually close, the image has real content (terrain, not
// a flat fill) running to its edges -- cropping is skipped and the original
// is copied through unchanged, since there's no reliable signal to trim on.
//
// Manual script, run by hand: `node scripts/crop-dungeon-maps.js`. Leaves
// data/dungeons/ untouched; only writes to public/maps/dungeons/.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const DUNGEONS_DIR = path.join(ROOT, "data", "dungeons");
const OUT_ROOT = path.join(ROOT, "public", "maps", "dungeons");

// folder name under data/dungeons/ -> route slug (matches each dungeon's
// existing data/dungeons/<slug>.json "id" field).
const TARGETS = {
  city_of_dalaran: "city-of-dalaran",
  hall_of_thanes: "hall-of-thanes",
  ruins_of_lordaeron: "ruins-of-lordaeron",
};

const CORNER_MATCH_THRESHOLD = 12; // max per-channel delta for corners to count as "the same fill color"
const CONTENT_THRESHOLD = 15; // max per-channel delta from bg color to still count as "background"
const PAD = 6; // px of padding kept around the detected content box

// Manual crop overrides, keyed by slug. For dungeons where the "uniform
// background" heuristic doesn't apply -- e.g. city-of-dalaran's export is a
// zoomed-out overworld tile (Alterac Mountains) with the actual instance
// (bounded by its purple leash-ring) occupying only the center, real terrain
// on every side, so there's no flat fill color to auto-detect against. Box
// picked by hand to fully contain the ring with a clean margin, verified
// visually (see 03-Handoffs/2026-10-01-dungeon-maps-extraction.md).
const MANUAL_CROPS = {
  "city-of-dalaran": { left: 300, top: 460, width: 760, height: 700 },
};

function colorsClose(a, b, threshold) {
  return Math.abs(a[0] - b[0]) <= threshold && Math.abs(a[1] - b[1]) <= threshold && Math.abs(a[2] - b[2]) <= threshold;
}

function findContentBBox(data, width, height, channels, bg, threshold) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const dr = Math.abs(data[i] - bg[0]);
      const dg = Math.abs(data[i + 1] - bg[1]);
      const db = Math.abs(data[i + 2] - bg[2]);
      if (dr > threshold || dg > threshold || db > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // entire image matched bg -- shouldn't happen, but guard anyway
  return { minX, minY, maxX, maxY };
}

async function processOne(folder, slug) {
  const dir = path.join(DUNGEONS_DIR, folder);
  const files = fs.readdirSync(dir);
  const pngFile = files.find((f) => f.endsWith(".png"));
  const jsonFile = files.find((f) => f.endsWith(".json"));
  if (!pngFile || !jsonFile) {
    return { slug, ok: false, error: `missing png/json in ${folder}` };
  }
  const pngPath = path.join(dir, pngFile);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, jsonFile), "utf8"));

  const img = sharp(pngPath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const px = (x, y) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)];
  const cornersUniform = colorsClose(corners[0], corners[1], CORNER_MATCH_THRESHOLD) && colorsClose(corners[0], corners[2], CORNER_MATCH_THRESHOLD) && colorsClose(corners[0], corners[3], CORNER_MATCH_THRESHOLD);

  const outDir = path.join(OUT_ROOT, slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "map.png");

  const manualBox = MANUAL_CROPS[slug];
  if (manualBox) {
    await sharp(pngPath).extract(manualBox).png().toFile(outPath);
    return { slug, ok: true, cropped: true, mapName: meta.map_name, outWidth: manualBox.width, outHeight: manualBox.height, box: manualBox, originalSize: { width, height }, manual: true };
  }

  if (!cornersUniform) {
    // No reliable background signal -- content likely runs to the edges
    // (or the tile export genuinely has no padding on this side). Copy the
    // source through unchanged rather than guess a crop box.
    await sharp(pngPath).png().toFile(outPath);
    return { slug, ok: true, cropped: false, mapName: meta.map_name, outWidth: width, outHeight: height, reason: "corners not uniform -- no auto-crop signal, copied as-is" };
  }

  const bbox = findContentBBox(data, width, height, channels, corners[0], CONTENT_THRESHOLD);
  if (!bbox) {
    await sharp(pngPath).png().toFile(outPath);
    return { slug, ok: true, cropped: false, mapName: meta.map_name, outWidth: width, outHeight: height, reason: "bbox scan found no content -- copied as-is" };
  }

  const left = Math.max(0, bbox.minX - PAD);
  const top = Math.max(0, bbox.minY - PAD);
  const right = Math.min(width, bbox.maxX + 1 + PAD);
  const bottom = Math.min(height, bbox.maxY + 1 + PAD);
  const cropWidth = right - left;
  const cropHeight = bottom - top;

  await sharp(pngPath).extract({ left, top, width: cropWidth, height: cropHeight }).png().toFile(outPath);

  return {
    slug,
    ok: true,
    cropped: true,
    mapName: meta.map_name,
    outWidth: cropWidth,
    outHeight: cropHeight,
    box: { left, top, right, bottom },
    originalSize: { width, height },
  };
}

async function main() {
  const results = [];
  for (const [folder, slug] of Object.entries(TARGETS)) {
    results.push(await processOne(folder, slug));
  }
  for (const r of results) {
    if (!r.ok) {
      console.log(`FAIL ${r.slug}: ${r.error}`);
      continue;
    }
    if (r.cropped) {
      const tag = r.manual ? "OK(manual)" : "OK";
      console.log(`${tag} ${r.slug} (${r.mapName}): ${r.originalSize.width}x${r.originalSize.height} -> ${r.outWidth}x${r.outHeight} (box ${JSON.stringify(r.box)})`);
    } else {
      console.log(`SKIP ${r.slug} (${r.mapName}): kept at ${r.outWidth}x${r.outHeight} -- ${r.reason}`);
    }
  }
}

main();
