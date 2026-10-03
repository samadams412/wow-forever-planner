import fs from "fs";
import path from "path";
import type { QuestDetail } from "@/lib/quests";

// Reads one quest's build-time detail shard (data/quests/detail/<id>.json,
// written by scripts/build-quests.js). Imported only by the statically
// generated /quests/[questId] page, which sets generateStaticParams and
// dynamicParams = false, so this read runs at build time and the shard
// directory is never traced into a serverless function.
export function getQuestById(id: number): QuestDetail | null {
  const file = path.join(process.cwd(), "data", "quests", "detail", `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as QuestDetail;
}
