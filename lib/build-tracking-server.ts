// Server-only: the Redis connection and keyed hashing for build tracking.
// Never import this from a client component.
import { createHmac } from "node:crypto";
import { Redis } from "@upstash/redis";
import {
  RAW_EVENTS_KEY,
  RAW_EVENTS_MAX,
  type BuildEventPayload,
  type StoredBuildEvent,
} from "@/lib/build-events";
import { decodeBuild, encodeBuild } from "@/lib/build-code";
import { isValidBuildState, totalPointsSpent } from "@/lib/talent-rules";
import { getClassTalentData } from "@/lib/wow-data";

// Opt-in for writing to the configured Redis from a local or development
// server. .env.local (from `vercel env pull`) holds the production database,
// so without this a local session would record real events.
const ALLOW_LOCAL_ENV = "BUILD_TRACKING_ALLOW_LOCAL";

function localWritesAllowed(): boolean {
  return process.env[ALLOW_LOCAL_ENV] === "1";
}

let warnedDisabled = false;
function warnDisabledOnce(reason: string): void {
  if (warnedDisabled) return;
  warnedDisabled = true;
  console.warn(`[build-tracking] disabled: ${reason}. Set ${ALLOW_LOCAL_ENV}=1 to write to the configured Redis anyway.`);
}

// Both URL and token are set by the Vercel Marketplace Upstash integration (or
// locally in .env.local -- see .env.example). Missing values turn tracking into
// a no-op rather than an error, so previews work without a database. Outside a
// production build (`next dev`) it is also a no-op unless explicitly allowed.
export function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (process.env.NODE_ENV !== "production" && !localWritesAllowed()) {
    warnDisabledOnce(`NODE_ENV is "${process.env.NODE_ENV}"`);
    return null;
  }
  return Redis.fromEnv();
}

// `next start` runs with NODE_ENV=production and .env.local even sets
// VERCEL_ENV=production, so neither tells a local production server apart from
// a deployment. The request host does: the deployed site is never served from
// a loopback address. Used by the capture route before anything is recorded.
// Reads the Host header (the name the client asked for), not request.url: a
// server bound with `-H 0.0.0.0` builds request.url from the bind address, and
// the header is what's guaranteed to carry the public domain in production.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

export function isLocalRequest(request: Request): boolean {
  let hostname: string;
  try {
    hostname = new URL(`http://${request.headers.get("host") ?? ""}`).hostname;
  } catch {
    return false;
  }
  if (!LOCAL_HOSTNAMES.has(hostname)) return false;
  if (localWritesAllowed()) return false;
  warnDisabledOnce(`request host is ${hostname}`);
  return true;
}

// Keyed (HMAC) rather than a bare hash so a stored value can't be reversed by
// hashing guesses: without BUILD_TRACKING_SECRET the hash is meaningless.
export function keyedHash(scope: "token" | "ip", value: string): string | null {
  const secret = process.env.BUILD_TRACKING_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}

// Decodes a build code with the planner's own decoder and rules. Returns the
// canonical current-version code, or null when the build couldn't have come
// from the planner: no points spent, more than the level-60 cap, or points
// past a row gate / missing prereq. Canonicalizing means a legacy link and its
// current-version equivalent count as the same build.
export function canonicalBuildCode(classId: string, buildCode: string): string | null {
  const classData = getClassTalentData(classId);
  if (!classData) return null;
  let ranks;
  try {
    ranks = decodeBuild(classData, buildCode);
  } catch {
    return null;
  }
  if (totalPointsSpent(classData.trees, ranks) === 0) return null;
  if (!isValidBuildState(classData.trees, ranks)) return null;
  return encodeBuild(classData, ranks);
}

// Per-IP burst window, per-IP daily cap on accepted events, and per-token
// daily cap. The token is minted by the browser, so the per-token cap and the
// per-token dedup below only stop accidental repeats; the per-IP limits are
// what bound a script minting a fresh token per request.
const IP_BURST_WINDOW_SECONDS = 60;
const IP_BURST_LIMIT = 30;
const IP_DAILY_ACCEPTED_LIMIT = 50;
const TOKEN_DAILY_LIMIT = 100;
const COUNTER_TTL_SECONDS = 2 * 24 * 60 * 60;

// Popularity signal: distinct hashed IPs per build per UTC day, as a Redis
// HyperLogLog (~12 KB max per key, ~0.8% error). Token minting can't inflate
// it, since one IP adds at most one to a build's count per day. Kept long
// enough for a rolling 30-day window; the per-day index set lists which builds
// have a key that day, so a reader doesn't need SCAN.
const HLL_TTL_SECONDS = 40 * 24 * 60 * 60;

export function buildHllKey(classId: string, buildCode: string, day: string): string {
  return `builds:hll:${classId}:${buildCode}:${day}`;
}

export function buildHllIndexKey(day: string): string {
  return `builds:hll-index:${day}`;
}

export type RecordResult = "accepted" | "duplicate" | "rate-limited" | "invalid-build" | "unavailable";

// Callers pass a payload already shape-checked by parseBuildEventPayload; this
// adds the build-validity check (which needs the talent data) before any write.
export async function recordBuildEvent(
  event: BuildEventPayload,
  ip: string,
  now = Date.now(),
): Promise<RecordResult> {
  const buildCode = canonicalBuildCode(event.classId, event.buildCode);
  if (!buildCode) return "invalid-build";

  const redis = getRedis();
  const tokenHash = keyedHash("token", event.token);
  const ipHash = keyedHash("ip", ip);
  if (!redis || !tokenHash || !ipHash) return "unavailable";

  const day = new Date(now).toISOString().slice(0, 10);
  const minute = Math.floor(now / (IP_BURST_WINDOW_SECONDS * 1000));
  const ipKey = `builds:rl:ip:${ipHash}:${minute}`;
  const ipDayKey = `builds:rl:ipday:${ipHash}:${day}`;
  const tokenKey = `builds:rl:tok:${tokenHash}:${day}`;

  const counts = await redis
    .pipeline()
    .incr(ipKey)
    .expire(ipKey, IP_BURST_WINDOW_SECONDS * 2)
    .incr(tokenKey)
    .expire(tokenKey, COUNTER_TTL_SECONDS)
    .get<number>(ipDayKey)
    .exec<[number, number, number, number, number | null]>();
  const ipCount = counts[0];
  const tokenCount = counts[2];
  const ipAcceptedToday = Number(counts[4] ?? 0);
  if (ipCount > IP_BURST_LIMIT || tokenCount > TOKEN_DAILY_LIMIT || ipAcceptedToday >= IP_DAILY_ACCEPTED_LIMIT) {
    return "rate-limited";
  }

  // Dedup at write time: one counted event per (type, token, build) per UTC
  // day. The key is claimed with SET NX before anything is queued, so a repeat
  // (a reload, a second save click, a late clipboard callback) never reaches
  // the raw list. Duplicates still count toward the burst and token limits.
  const dedupKey = `builds:dedup:${event.type}:${tokenHash}:${event.classId}:${buildCode}:${day}`;
  const claimed = await redis.set(dedupKey, 1, { nx: true, ex: COUNTER_TTL_SECONDS });
  if (claimed === null) return "duplicate";

  const stored: StoredBuildEvent = {
    type: event.type,
    classId: event.classId,
    buildCode,
    tokenHash,
    ts: now,
  };
  const hllKey = buildHllKey(event.classId, buildCode, day);
  const hllIndexKey = buildHllIndexKey(day);
  await redis
    .pipeline()
    .rpush(RAW_EVENTS_KEY, stored)
    .ltrim(RAW_EVENTS_KEY, -RAW_EVENTS_MAX, -1)
    .incr(ipDayKey)
    .expire(ipDayKey, COUNTER_TTL_SECONDS)
    .pfadd(hllKey, ipHash)
    .expire(hllKey, HLL_TTL_SECONDS)
    .sadd(hllIndexKey, `${event.classId}:${buildCode}`)
    .expire(hllIndexKey, HLL_TTL_SECONDS)
    .exec();
  return "accepted";
}
