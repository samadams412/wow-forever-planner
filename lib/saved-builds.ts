export type SavedBuild = {
  id: string;
  name: string;
  classId: string;
  // Race stopped being part of the planner's build state -- kept optional,
  // read-nowhere, purely so builds saved before that change still parse.
  raceId?: string | null;
  buildCode: string;
  createdAt: number;
};

const STORAGE_KEY = "forevercraft:saved-builds";

function readAll(): SavedBuild[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(builds: SavedBuild[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(builds));
    return true;
  } catch {
    // Storage unavailable (private browsing, quota exceeded, disabled, etc).
    return false;
  }
}

export function getSavedBuilds(): SavedBuild[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveBuild(build: { name: string; classId: string; buildCode: string }): SavedBuild | null {
  const entry: SavedBuild = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    ...build,
  };
  const builds = readAll();
  builds.push(entry);
  return writeAll(builds) ? entry : null;
}

export function deleteSavedBuild(id: string): boolean {
  const builds = readAll().filter((b) => b.id !== id);
  return writeAll(builds);
}
