// Pole of inaccessibility: the point inside a polygon (with holes) that is
// farthest from any edge -- a small reimplementation of Mapbox's polylabel
// algorithm (grid refinement guided by a priority queue of candidate cells,
// each bounded by the max distance achievable anywhere inside it), not a
// pulled-in dependency (this repo has no `polylabel` package installed and
// this project avoids adding one for a ~100-line, well-documented algorithm
// with no other use anywhere in the codebase).
//
// `polygon` is {outer: [[x,y],...closed], holes: [[[x,y],...closed], ...]}
// in the same coordinate space the caller wants the label point back in
// (this project calls it with grid coordinates, then converts the single
// resulting point to world coordinates -- cheaper than converting every
// vertex of a large polygon just to compute one label point).

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  let dx = bx - ax;
  let dy = by - ay;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      ax = bx;
      ay = by;
    } else if (t > 0) {
      ax += dx * t;
      ay += dy * t;
    }
  }
  dx = px - ax;
  dy = py - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(x, y, polygon) {
  if (!pointInRing(x, y, polygon.outer)) return false;
  for (const hole of polygon.holes) if (pointInRing(x, y, hole)) return false;
  return true;
}

// Signed distance: positive inside, negative outside.
function distanceToPolygon(x, y, polygon) {
  let minDist = Infinity;
  const rings = [polygon.outer, ...polygon.holes];
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const d = pointToSegmentDistance(x, y, ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1]);
      if (d < minDist) minDist = d;
    }
  }
  return pointInPolygon(x, y, polygon) ? minDist : -minDist;
}

class Cell {
  constructor(x, y, h, polygon) {
    this.x = x;
    this.y = y;
    this.h = h;
    this.d = distanceToPolygon(x, y, polygon);
    this.max = this.d + this.h * Math.SQRT2;
  }
}

// Simple binary-heap-free priority "queue" (array + sort) -- fine at the
// cell counts this ever runs at (thousands, not millions) per zone.
class Queue {
  constructor() {
    this.items = [];
  }
  push(cell) {
    this.items.push(cell);
  }
  pop() {
    let bestI = 0;
    for (let i = 1; i < this.items.length; i++) if (this.items[i].max > this.items[bestI].max) bestI = i;
    return this.items.splice(bestI, 1)[0];
  }
  get length() {
    return this.items.length;
  }
}

function bbox(outer) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of outer) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function polylabel(polygon, precision = 1) {
  const { minX, minY, maxX, maxY } = bbox(polygon.outer);
  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);
  if (cellSize === 0) return [minX, minY];
  let h = cellSize / 2;

  const queue = new Queue();
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      queue.push(new Cell(x + h, y + h, h, polygon));
    }
  }

  let best = new Cell(minX + width / 2, minY + height / 2, 0, polygon);
  const centroid = polygonCentroid(polygon.outer);
  const bboxCell = new Cell(centroid[0], centroid[1], 0, polygon);
  if (bboxCell.d > best.d) best = bboxCell;

  let iterations = 0;
  const maxIterations = 20000; // safety valve; real zones converge in <1000
  while (queue.length && iterations++ < maxIterations) {
    const cell = queue.pop();
    if (cell.d > best.d) best = cell;
    if (cell.max - best.d <= precision) continue;
    const half = cell.h / 2;
    queue.push(new Cell(cell.x - half, cell.y - half, half, polygon));
    queue.push(new Cell(cell.x + half, cell.y - half, half, polygon));
    queue.push(new Cell(cell.x - half, cell.y + half, half, polygon));
    queue.push(new Cell(cell.x + half, cell.y + half, half, polygon));
  }
  return [best.x, best.y];
}

function polygonCentroid(ring) {
  let x = 0,
    y = 0,
    area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const f = x1 * y2 - x2 * y1;
    x += (x1 + x2) * f;
    y += (y1 + y2) * f;
    area += f;
  }
  area *= 0.5;
  if (area === 0) return ring[0];
  return [x / (6 * area), y / (6 * area)];
}

module.exports = { polylabel, distanceToPolygon, pointInPolygon };
