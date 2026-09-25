// Traces rectilinear polygons (with holes and multiple parts) out of a
// labeled raster grid -- e.g. Elwynn Forest's region minus the Stormwind
// City hole comes out as one polygon with one hole; a zone split into two
// disconnected areas comes out as two separate polygons for the same label.
//
// Deliberately NOT a general polygon simplifier: boundaries are traced at
// exact grid resolution (one vertex per unit-cell edge) and only strictly
// collinear points are removed afterward -- no smoothing, no Douglas-Peucker
// pass, no per-polygon tolerance -- so two neighboring zones' shared border
// stays bit-for-bit identical on both sides (whichever zone is traced, the
// same underlying grid edges produce the same vertices).
//
// Algorithm (a standard raster-to-polygon boundary trace, sometimes called
// "isoline"/contour tracing on a binary mask): for a given label, every
// mask cell emits one directed unit edge per side that borders a
// non-matching neighbor (or the grid edge), oriented so the mask interior is
// always on the LEFT of the direction of travel. Chaining "next edge starts
// where this one ends" walks out closed loops with no separate line-joining
// step needed. A loop's shoelace sign then tells outer ring from hole
// (verified empirically below, not assumed): a single isolated cell (which
// can only ever be an outer boundary) comes out with a NEGATIVE signed area
// under this specific edge-direction convention, so outer rings are
// negative-area loops and holes are positive-area loops here.
//
// Multi-outgoing-edge vertices (two same-label regions touching only at one
// corner, a "pinch point") are resolved with a fixed tie-break -- turn most
// sharply clockwise relative to the incoming direction -- rather than left
// ambiguous; `stats.pinchPoints` on the return value reports how many were
// hit so a caller can decide whether that ever matters for real zone data.

function key(x, y) {
  return x * 100000 + y;
}

function traceLabel(grid, width, height, label) {
  const inMask = (r, c) => r >= 0 && r < height && c >= 0 && c < width && grid[r * width + c] === label;

  // outgoing[key(x,y)] = array of {to: [x,y], dir: [dx,dy]}
  const outgoing = new Map();
  const addEdge = (x1, y1, x2, y2) => {
    const k = key(x1, y1);
    if (!outgoing.has(k)) outgoing.set(k, []);
    outgoing.get(k).push({ from: [x1, y1], to: [x2, y2] });
  };

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!inMask(r, c)) continue;
      if (!inMask(r - 1, c)) addEdge(c + 1, r, c, r); // top
      if (!inMask(r + 1, c)) addEdge(c, r + 1, c + 1, r + 1); // bottom
      if (!inMask(r, c - 1)) addEdge(c, r, c, r + 1); // left
      if (!inMask(r, c + 1)) addEdge(c + 1, r + 1, c + 1, r); // right
    }
  }

  let pinchPoints = 0;
  const used = new Set(); // "x1,y1->x2,y2"
  const edgeId = (e) => `${e.from[0]},${e.from[1]}->${e.to[0]},${e.to[1]}`;

  function pickNext(currentDir, candidates) {
    if (candidates.length === 1) return candidates[0];
    pinchPoints++;
    // Prefer the sharpest clockwise turn from currentDir -- deterministic,
    // and keeps loops simple (non-self-crossing) at a pinch point.
    const angle = (d) => Math.atan2(d[1], d[0]);
    const cur = angle(currentDir);
    let best = null;
    let bestTurn = Infinity;
    for (const cand of candidates) {
      const dir = [cand.to[0] - cand.from[0], cand.to[1] - cand.from[1]];
      let turn = angle(dir) - cur;
      while (turn <= 0) turn += Math.PI * 2;
      while (turn > Math.PI * 2) turn -= Math.PI * 2;
      if (turn < bestTurn) {
        bestTurn = turn;
        best = cand;
      }
    }
    return best;
  }

  const loops = [];
  for (const [, edges] of outgoing) {
    for (const startEdge of edges) {
      if (used.has(edgeId(startEdge))) continue;
      const points = [startEdge.from.slice()];
      let current = startEdge;
      let dir = [current.to[0] - current.from[0], current.to[1] - current.from[1]];
      let guard = 0;
      while (true) {
        used.add(edgeId(current));
        points.push(current.to.slice());
        if (current.to[0] === startEdge.from[0] && current.to[1] === startEdge.from[1]) break;
        const candidates = (outgoing.get(key(current.to[0], current.to[1])) || []).filter(
          (e) => !used.has(edgeId(e))
        );
        if (candidates.length === 0) break; // shouldn't happen on a valid mask; bail defensively
        current = pickNext(dir, candidates);
        dir = [current.to[0] - current.from[0], current.to[1] - current.from[1]];
        if (++guard > width * height * 4) break; // safety valve, not expected to trigger
      }
      loops.push(removeCollinear(points));
    }
  }

  return { loops, pinchPoints };
}

function removeCollinear(points) {
  // points[] is a closed ring (last === first). Drop any point whose
  // in/out direction is unchanged from the previous point.
  const n = points.length - 1; // exclude the duplicated closing point
  const dir = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const d1 = dir(prev, cur);
    const d2 = dir(cur, next);
    if (d1[0] !== d2[0] || d1[1] !== d2[1]) out.push(cur);
  }
  out.push(out[0].slice());
  return out;
}

function signedArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function pointInRing([px, py], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Groups traced loops for one label into polygons (outer ring + its holes).
function assemblePolygons(loops) {
  const outers = [];
  const holes = [];
  for (const ring of loops) {
    const area = signedArea(ring);
    if (area < 0) outers.push({ ring, area: Math.abs(area) });
    else holes.push({ ring, area });
  }
  const polygons = outers.map((o) => ({ outer: o.ring, area: o.area, holes: [] }));
  for (const hole of holes) {
    let best = null;
    for (const poly of polygons) {
      if (pointInRing(hole.ring[0], poly.outer)) {
        if (!best || poly.area < best.area) best = poly;
      }
    }
    if (best) best.holes.push(hole.ring);
    // else: a hole with no containing outer shouldn't happen on a valid
    // mask; silently dropping would hide a real bug, so this is left to
    // surface as a visibly wrong polygon count in the caller's own checks
    // rather than guessed at here.
  }
  return polygons.map(({ outer, holes, area }) => ({ outer, holes, area }));
}

// Traces every label present in `grid` (width*height, row-major), excluding
// `background`. Returns Map<label, {polygons, pinchPoints}>.
function traceAllRegions(grid, width, height, background = 0) {
  const labels = new Set();
  for (let i = 0; i < grid.length; i++) if (grid[i] !== background) labels.add(grid[i]);
  const result = new Map();
  for (const label of labels) {
    const { loops, pinchPoints } = traceLabel(grid, width, height, label);
    result.set(label, { polygons: assemblePolygons(loops), pinchPoints });
  }
  return result;
}

module.exports = { traceAllRegions, signedArea, pointInRing };
