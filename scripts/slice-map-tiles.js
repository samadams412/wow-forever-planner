#!/usr/bin/env node
// Slices a wow.export continent map export (a stitched PNG + its JSON
// sidecar, e.g. maps/azeroth/eastern_kingdoms_forever/azeroth_<hash>.png)
// into a Leaflet-compatible zoom/tile pyramid under public/map/<name>/tiles.
//
// Scoped right now to a small proof-of-concept crop (see PROOF below), not
// full-continent tiling -- see this script's own header comment in
// CLAUDE.md's world-map architecture note for why. Re-run with a different
// crop/zoom count once the proof is validated and a storage decision is
// made for full continent coverage (many thousand tiles).
//
// Usage: node scripts/slice-map-tiles.js
//
// wow.export's own world<->pixel coordinate convention: the image's
// horizontal axis (pixel X) maps to the sidecar's `world_y`, and the
// vertical axis (pixel Y) maps to `world_x` -- WoW's engine has +X as
// north (row) and +Y as west (column), rotated from the image's own axes.
// Confirmed exactly via tile-count math (wide * 533.333 == |Δworld_y|,
// high * 533.333 == |Δworld_x|) and visually (the computed Uldaman pixel
// lands right on the real Loch Modan/Badlands zone border).

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SOURCE_PNG =
  "C:/Users/samue/wow.export/maps/azeroth/eastern_kingdoms_forever/azeroth_ec7b93ee.png";
const SOURCE_JSON =
  "C:/Users/samue/wow.export/maps/azeroth/eastern_kingdoms_forever/azeroth_ec7b93ee.json";

const OUT_DIR = path.join(__dirname, "..", "public", "map", "proof-badlands", "tiles");
const TILE_SIZE = 512;

// Uldaman's real world coords (confirmed live against foreverchanges.pro's
// own map in an earlier session: "world -6,060, -2,955"), used only to
// center this proof crop -- not hardcoded into the app itself.
const CENTER_WORLD = { x: -6060, y: -2955 };
const CROP_SIZE = 2048; // native-zoom crop, evenly divisible by TILE_SIZE

function worldToPixel(meta, worldX, worldY) {
  const { top_left, bottom_right } = meta.corners;
  const fracX = (worldY - top_left.world_y) / (bottom_right.world_y - top_left.world_y);
  const fracY = (worldX - top_left.world_x) / (bottom_right.world_x - top_left.world_x);
  return { x: fracX * meta.image.width, y: fracY * meta.image.height };
}

async function sliceZoomLevel(image, zoom, size) {
  const cols = size / TILE_SIZE;
  const dir = path.join(OUT_DIR, String(zoom));
  fs.mkdirSync(dir, { recursive: true });
  for (let row = 0; row < cols; row++) {
    for (let col = 0; col < cols; col++) {
      await image
        .clone()
        .extract({ left: col * TILE_SIZE, top: row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE })
        .webp({ quality: 85 })
        .toFile(path.join(dir, `${col}_${row}.webp`));
    }
  }
  console.log(`zoom ${zoom}: ${cols * cols} tiles (${size}x${size})`);
}

async function main() {
  const meta = JSON.parse(fs.readFileSync(SOURCE_JSON, "utf8"));
  const center = worldToPixel(meta, CENTER_WORLD.x, CENTER_WORLD.y);
  const left = Math.round(center.x - CROP_SIZE / 2);
  const top = Math.round(center.y - CROP_SIZE / 2);
  console.log("crop box", { left, top, size: CROP_SIZE, centerPixel: center });

  const crop = sharp(SOURCE_PNG).extract({ left, top, width: CROP_SIZE, height: CROP_SIZE });
  const cropBuffer = await crop.png().toBuffer();

  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  // zoom 1 = native resolution, zoom 0 = half-res (standard doubling pyramid)
  await sliceZoomLevel(sharp(cropBuffer), 1, CROP_SIZE);
  const half = await sharp(cropBuffer).resize(CROP_SIZE / 2, CROP_SIZE / 2).toBuffer();
  await sliceZoomLevel(sharp(half), 0, CROP_SIZE / 2);

  // Sidecar describing this crop for the app to consume -- crop-local pixel
  // origin plus the same world-coordinate corner data, so a real-world
  // coordinate can still be converted straight to a pixel position within
  // this crop (see components/map/LeafletZoneMap.tsx).
  fs.writeFileSync(
    path.join(__dirname, "..", "public", "map", "proof-badlands", "meta.json"),
    JSON.stringify(
      {
        cropOrigin: { left, top },
        cropSize: CROP_SIZE,
        tileSize: TILE_SIZE,
        maxNativeZoom: 1,
        sourceCorners: meta.corners,
        sourceImage: meta.image,
      },
      null,
      1
    )
  );
  console.log("done");
}

main();
