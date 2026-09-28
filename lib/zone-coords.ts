// In-game-style 0-100 zone coordinates (one decimal), derived from a zone's
// own worldBounds -- the same UiMapAssignment.Region rectangle zones.json
// already carries, not a separate data source.
//
// Direction convention (WoW's own in-game coordinate display, not this
// project's own invention): the first number increases going SOUTH, the
// second increases going WEST. Combined with this project's own documented
// world-coordinate axis swap (world_x increases NORTH -- CLAUDE.md's
// world-map coordinate note, matching scripts/lib/chunk-grid-coords.js),
// "increases south" means the first number moves opposite to world_x, so
// it's computed as (maxX - worldX)/(maxX-minX) -- a flip -- while world_y
// already increases WEST the same direction as the second number, so that
// one is a direct (maxY-not-needed) (worldY-minY)/(maxY-minY) with no flip.
// Checked against a real, well-known reference (Goldshire, ~40/65 by common
// community knowledge) before trusting the direction -- but per this
// feature's own task, real in-game coordinates from the person building
// this should still confirm it before this is considered done.
export function worldToZoneCoords(
  worldX: number,
  worldY: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): { x: number; y: number } {
  const xSpan = bounds.maxX - bounds.minX;
  const ySpan = bounds.maxY - bounds.minY;
  const xPct = xSpan === 0 ? 0 : ((bounds.maxX - worldX) / xSpan) * 100;
  const yPct = ySpan === 0 ? 0 : ((worldY - bounds.minY) / ySpan) * 100;
  return { x: Math.round(xPct * 10) / 10, y: Math.round(yPct * 10) / 10 };
}
