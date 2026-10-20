// Raid comp rosters saved to this browser, same pattern as
// lib/saved-builds.ts (one JSON array under one key, newest first). Local
// only: no tracking events. A roster is stored as its share-link query
// (lib/raid-comp.ts rosterQuery, without the "?"), so loading goes through
// the same versioned decoder as a shared link.
export type SavedRoster = {
  id: string;
  name: string;
  query: string;
  createdAt: number;
};

const STORAGE_KEY = "forevercraft:saved-rosters";

function readAll(): SavedRoster[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rosters: SavedRoster[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rosters));
    return true;
  } catch {
    // Storage unavailable (private browsing, quota exceeded, disabled, etc).
    return false;
  }
}

export function getSavedRosters(): SavedRoster[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveRoster(roster: { name: string; query: string }): SavedRoster | null {
  const entry: SavedRoster = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    ...roster,
  };
  const rosters = readAll();
  rosters.push(entry);
  return writeAll(rosters) ? entry : null;
}

export function deleteSavedRoster(id: string): boolean {
  return writeAll(readAll().filter((r) => r.id !== id));
}
