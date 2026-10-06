// Server-only: drains raw build events into per-class and per-talent counters.
//
// Redis layout (all counters, no per-visitor data):
//   builds:agg:classes  field "<classId>:<type>"              -> events
//   builds:agg:talents  field "<classId>:<talentId>:<type>"   -> events whose build spends >0 points on that talent
//   builds:agg:meta     fields lastRollupAt, windowStart, eventsProcessed
//
// Ordering: counters are written before the processed raw events are trimmed,
// so a crash in between re-counts a batch rather than losing it (at-least-once).
import { getClassTalentData } from "@/lib/wow-data";
import { decodeBuild } from "@/lib/build-code";
import {
  RAW_EVENTS_KEY,
  RAW_RETENTION_MS,
  isBuildEventType,
  type StoredBuildEvent,
} from "@/lib/build-events";
import { getRedis } from "@/lib/build-tracking-server";

export const AGG_CLASSES_KEY = "builds:agg:classes";
export const AGG_TALENTS_KEY = "builds:agg:talents";
export const AGG_META_KEY = "builds:agg:meta";
const ROLLUP_LOCK_KEY = "builds:rollup:lock";
const ROLLUP_LOCK_SECONDS = 15 * 60;
// Upper bound per run. Daily runs against a 100k-capped list stay well under it.
const ROLLUP_BATCH_MAX = 50_000;

export type RollupSummary =
  | { status: "unavailable" | "locked" }
  | {
      status: "ok";
      read: number;
      aggregated: number;
      expired: number;
      malformed: number;
    };

function isStoredBuildEvent(value: unknown): value is StoredBuildEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    isBuildEventType(e.type) &&
    typeof e.classId === "string" &&
    typeof e.buildCode === "string" &&
    typeof e.tokenHash === "string" &&
    typeof e.ts === "number"
  );
}

// Pure: turns a batch of already-validated events into counter increments.
// Build codes that don't decode for their class are skipped (counted in the
// class total, which is harmless, but add nothing per talent).
export function aggregateEvents(events: StoredBuildEvent[]): {
  classes: Record<string, number>;
  talents: Record<string, number>;
} {
  const classes: Record<string, number> = {};
  const talents: Record<string, number> = {};
  for (const event of events) {
    const classKey = `${event.classId}:${event.type}`;
    classes[classKey] = (classes[classKey] ?? 0) + 1;

    const classData = getClassTalentData(event.classId);
    if (!classData) continue;
    let ranks;
    try {
      ranks = decodeBuild(classData, event.buildCode);
    } catch {
      continue;
    }
    for (const [talentId, rank] of Object.entries(ranks)) {
      if (rank <= 0) continue;
      const talentKey = `${event.classId}:${talentId}:${event.type}`;
      talents[talentKey] = (talents[talentKey] ?? 0) + 1;
    }
  }
  return { classes, talents };
}

export async function runBuildRollup(now = Date.now()): Promise<RollupSummary> {
  const redis = getRedis();
  if (!redis) return { status: "unavailable" };

  // One run at a time. A lock left behind by a crash expires on its own.
  const locked = await redis.set(ROLLUP_LOCK_KEY, now, { nx: true, ex: ROLLUP_LOCK_SECONDS });
  if (!locked) return { status: "locked" };

  try {
    const total = await redis.llen(RAW_EVENTS_KEY);
    if (total === 0) return { status: "ok", read: 0, aggregated: 0, expired: 0, malformed: 0 };

    // Head-of-list batch. New events are only ever appended to the tail, so
    // trimming the first `read` entries afterwards removes exactly this batch.
    const read = Math.min(total, ROLLUP_BATCH_MAX);
    const raw = await redis.lrange<unknown>(RAW_EVENTS_KEY, 0, read - 1);

    const cutoff = now - RAW_RETENTION_MS;
    const valid: StoredBuildEvent[] = [];
    let expired = 0;
    let malformed = 0;
    for (const item of raw) {
      if (!isStoredBuildEvent(item)) {
        malformed++;
      } else if (item.ts < cutoff) {
        expired++;
      } else {
        valid.push(item);
      }
    }

    const { classes, talents } = aggregateEvents(valid);
    const pipeline = redis.pipeline();
    for (const [field, count] of Object.entries(classes)) {
      pipeline.hincrby(AGG_CLASSES_KEY, field, count);
    }
    for (const [field, count] of Object.entries(talents)) {
      pipeline.hincrby(AGG_TALENTS_KEY, field, count);
    }
    pipeline.hsetnx(AGG_META_KEY, "windowStart", new Date(now).toISOString().slice(0, 10));
    pipeline.hset(AGG_META_KEY, { lastRollupAt: new Date(now).toISOString() });
    pipeline.hincrby(AGG_META_KEY, "eventsProcessed", valid.length);
    await pipeline.exec();

    await redis.ltrim(RAW_EVENTS_KEY, read, -1);

    return { status: "ok", read, aggregated: valid.length, expired, malformed };
  } finally {
    await redis.del(ROLLUP_LOCK_KEY);
  }
}
