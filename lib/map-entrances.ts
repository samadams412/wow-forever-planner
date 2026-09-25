import { getDungeon } from "./dungeons";
import { hasDungeonLoot } from "./dungeon-loot";
import rawEntrancesData from "@/data/map-entrances.json";
import raidsData from "@/data/raids.json";
import battlegroundsData from "@/data/battlegrounds.json";

// Turns data/map-entrances.json (raw Map.Corpse positions, no display
// data) into map-ready markers: resolves each entry's name/level range
// from data/dungeons.json, data/raids.json or data/battlegrounds.json,
// skips entries with no usable position, and groups entrances that sit
// within ENTRANCE_GROUP_DISTANCE_YARDS of each other on the same
// continent into one marker (Blackrock Mountain's 5 separate entrances,
// Scarlet Monastery's 4 wings, Dire Maul's 3, Stratholme's 2, Ahn'Qiraj's
// 2 -- found empirically by computing every pairwise distance among all
// 32 positioned entrances before picking a threshold, not guessed: every
// one of those pairs sits under 600 yards apart, while the nearest
// distinct-instance pair (Uldaman/Zul'Farrak, two unrelated dungeons that
// just happen to be close on the map) is 733 yards apart -- 600 sits
// cleanly between the two with real margin).

export const ENTRANCE_GROUP_DISTANCE_YARDS = 600;

export type EntranceKind = "dungeon" | "raid" | "battleground";

export type EntranceInfo = {
  id: string;
  kind: EntranceKind;
  name: string;
  levelMin: number | null;
  levelMax: number | null;
  worldPosition: { x: number; y: number };
  source: string | null;
  confidence: string;
  href: string | null;
};

export type EntranceMarker =
  | ({ type: "single" } & EntranceInfo)
  | {
      type: "group";
      id: string;
      kind: EntranceKind;
      name: string;
      worldPosition: { x: number; y: number };
      members: EntranceInfo[];
    };

type RawEntrance = {
  kind: EntranceKind;
  mapId: string | null;
  continent: string | null;
  worldPosition: { x: number; y: number } | null;
  source: string | null;
  confidence: string;
  note: string | null;
};

const rawEntrances = rawEntrancesData as Record<string, RawEntrance>;
const raidById = new Map(raidsData.raids.map((r) => [r.id, r]));
const bgById = new Map(battlegroundsData.battlegrounds.map((b) => [b.id, b]));

// Skipped regardless of position, with a stated reason -- distinct from
// "no position", which is a data gap, not a decision. Emerald Dream is
// real client data (see CLAUDE.md's map-entrances session note) but isn't
// a confirmed Classic-era or confirmed-Forever raid this project tracks
// anywhere else; it also has no position in this build either way, so this
// entry is currently redundant with the no-position skip below, but is
// listed explicitly so the reason survives even after a future build adds
// a real position for it.
const ALWAYS_SKIP: Record<string, string> = {
  "emerald-dream": "pending a decision on whether this new-datamined raid belongs on the map at all (real client data, but not a confirmed Classic or Forever raid tracked elsewhere in this project)",
};

function resolveInfo(id: string, raw: RawEntrance): EntranceInfo | null {
  if (!raw.worldPosition) return null;
  let name: string;
  let levelMin: number | null = null;
  let levelMax: number | null = null;
  let href: string | null = null;
  if (raw.kind === "dungeon") {
    const d = getDungeon(id);
    if (!d) return null;
    name = d.name;
    levelMin = d.levelMin;
    levelMax = d.levelMax;
    href = hasDungeonLoot(id) ? `/reference/dungeons/loot/${id}` : null;
  } else if (raw.kind === "raid") {
    const r = raidById.get(id);
    name = r?.name ?? id;
    levelMin = r?.levelMin ?? null;
    levelMax = r?.levelMax ?? null;
  } else {
    const b = bgById.get(id);
    name = b?.name ?? id;
  }
  return {
    id,
    kind: raw.kind,
    name,
    levelMin,
    levelMax,
    worldPosition: raw.worldPosition,
    source: raw.source,
    confidence: raw.confidence,
    href,
  };
}

// A handful of real clusters don't share a clean naming convention to
// derive a group label from automatically (deriveGroupLabel's two
// heuristics below cover Scarlet Monastery/Dire Maul/Stratholme via a
// shared "X: Y" prefix, and Ahn'Qiraj via a shared trailing word) --
// Blackrock Mountain's five entrances (Lower/Upper Blackrock Spire,
// Blackrock Depths, Molten Core, Blackwing Lair) are five fully
// independently-named places that just happen to all be entrances into or
// around the same mountain. Keyed by the cluster's own member ids, sorted
// and joined -- computed once from the real clustering, not hand-guessed.
const GROUP_LABEL_OVERRIDES: Record<string, string> = {
  "blackrock-depths,blackwing-lair,lbrs,molten-core,ubrs": "Blackrock Mountain",
};

function deriveGroupLabel(members: EntranceInfo[]): string {
  const colonPrefixes = members.map((m) => m.name.split(":")[0].trim());
  if (members.some((m) => m.name.includes(":")) && colonPrefixes.every((p) => p === colonPrefixes[0])) {
    return colonPrefixes[0];
  }
  const sig = members
    .map((m) => m.id)
    .sort()
    .join(",");
  if (GROUP_LABEL_OVERRIDES[sig]) return GROUP_LABEL_OVERRIDES[sig];
  const lastWords = members.map((m) => m.name.trim().split(/\s+/).pop());
  if (lastWords.every((w) => w === lastWords[0])) return lastWords[0]!;
  // Falls back to the first member's own name rather than throwing --
  // still a correct (if less pretty) label. Not expected to fire for any
  // cluster this project's current data actually produces.
  return members[0].name;
}

function clusterEntrances(infos: EntranceInfo[]): EntranceMarker[] {
  const parent = infos.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  for (let i = 0; i < infos.length; i++) {
    for (let j = i + 1; j < infos.length; j++) {
      const dx = infos[i].worldPosition.x - infos[j].worldPosition.x;
      const dy = infos[i].worldPosition.y - infos[j].worldPosition.y;
      if (Math.hypot(dx, dy) <= ENTRANCE_GROUP_DISTANCE_YARDS) union(i, j);
    }
  }
  const groups = new Map<number, EntranceInfo[]>();
  for (let i = 0; i < infos.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(infos[i]);
  }
  const markers: EntranceMarker[] = [];
  for (const members of groups.values()) {
    if (members.length === 1) {
      markers.push({ type: "single", ...members[0] });
      continue;
    }
    const kind: EntranceKind = members.some((m) => m.kind === "raid")
      ? "raid"
      : members.some((m) => m.kind === "dungeon")
        ? "dungeon"
        : "battleground";
    const avgX = members.reduce((s, m) => s + m.worldPosition.x, 0) / members.length;
    const avgY = members.reduce((s, m) => s + m.worldPosition.y, 0) / members.length;
    markers.push({
      type: "group",
      id: `group:${members
        .map((m) => m.id)
        .sort()
        .join("+")}`,
      kind,
      name: deriveGroupLabel(members),
      worldPosition: { x: avgX, y: avgY },
      members,
    });
  }
  return markers;
}

export function getEntranceMarkers(continentId: string): EntranceMarker[] {
  const infos: EntranceInfo[] = [];
  for (const [id, raw] of Object.entries(rawEntrances)) {
    if (ALWAYS_SKIP[id]) continue;
    if (raw.continent !== continentId) continue;
    const info = resolveInfo(id, raw);
    if (info) infos.push(info);
  }
  return clusterEntrances(infos);
}

// For the "entrances with no position" report -- every entry, both
// continents, whether skipped for lacking a position or explicitly listed
// in ALWAYS_SKIP.
export function getSkippedEntrances(): { id: string; kind: EntranceKind; reason: string }[] {
  const out: { id: string; kind: EntranceKind; reason: string }[] = [];
  for (const [id, raw] of Object.entries(rawEntrances)) {
    if (ALWAYS_SKIP[id]) {
      out.push({ id, kind: raw.kind, reason: ALWAYS_SKIP[id] });
      continue;
    }
    if (!raw.worldPosition) {
      out.push({ id, kind: raw.kind, reason: raw.note ?? "no world position in map-entrances.json" });
    }
  }
  return out;
}
