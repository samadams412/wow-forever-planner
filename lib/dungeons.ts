import dungeonsData from "@/data/dungeons.json";

export type Dungeon = {
  id: string;
  name: string;
  type: "new" | "classic";
  levelMin: number;
  levelMax: number;
  abbr?: string;
  faction?: "Alliance" | "Horde" | null;
  zone?: string;
  description?: string;
  image?: string;
  confidence?: "confirmed" | "estimated";
};

export const dungeons: Dungeon[] = dungeonsData.dungeons as Dungeon[];

export function getDungeon(id: string): Dungeon | undefined {
  return dungeons.find((d) => d.id === id);
}

export const MIN_DUNGEON_LEVEL = Math.min(...dungeons.map((d) => d.levelMin));
export const MAX_DUNGEON_LEVEL = Math.max(...dungeons.map((d) => d.levelMax));
