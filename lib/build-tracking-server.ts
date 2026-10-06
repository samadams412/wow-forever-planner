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

// Both are set by the Vercel Marketplace Upstash integration (or locally in
// .env.local -- see .env.example). Missing values turn tracking into a no-op
// rather than an error, so local dev and previews work without a database.
export function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return Redis.fromEnv();
}

// Keyed (HMAC) rather than a bare hash so a stored value can't be reversed by
// hashing guesses: without BUILD_TRACKING_SECRET the hash is meaningless.
export function keyedHash(scope: "token" | "ip", value: string): string | null {
  const secret = process.env.BUILD_TRACKING_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}

// Per-IP burst window and per-token daily cap. Both counters live in the same
// Redis as the events and expire on their own, so nothing needs cleaning up.
const IP_BURST_WINDOW_SECONDS = 60;
const IP_BURST_LIMIT = 30;
const TOKEN_DAILY_LIMIT = 100;
const COUNTER_TTL_SECONDS = 2 * 24 * 60 * 60;

export type RecordResult = "accepted" | "duplicate" | "rate-limited" | "unavailable";

// Validates nothing itself -- callers pass a payload already checked by
// parseBuildEventPayload. Returns "unavailable" when tracking isn't configured.
export async function recordBuildEvent(
  event: BuildEventPayload,
  ip: string,
  now = Date.now(),
): Promise<RecordResult> {
  const redis = getRedis();
  const tokenHash = keyedHash("token", event.token);
  const ipHash = keyedHash("ip", ip);
  if (!redis || !tokenHash || !ipHash) return "unavailable";

  const day = new Date(now).toISOString().slice(0, 10);
  const minute = Math.floor(now / (IP_BURST_WINDOW_SECONDS * 1000));
  const ipKey = `builds:rl:ip:${ipHash}:${minute}`;
  const tokenKey = `builds:rl:tok:${tokenHash}:${day}`;

  const counts = await redis
    .pipeline()
    .incr(ipKey)
    .expire(ipKey, IP_BURST_WINDOW_SECONDS * 2)
    .incr(tokenKey)
    .expire(tokenKey, COUNTER_TTL_SECONDS)
    .exec<[number, number, number, number]>();
  const ipCount = counts[0];
  const tokenCount = counts[2];
  if (ipCount > IP_BURST_LIMIT || tokenCount > TOKEN_DAILY_LIMIT) return "rate-limited";

  // Dedup at write time: one counted event per (type, token, build) per UTC
  // day. The key is claimed with SET NX before anything is queued, so a repeat
  // (a reload, a second save click, a late clipboard callback) never reaches
  // the raw list. Duplicates still count toward the rate limits above.
  const dedupKey = `builds:dedup:${event.type}:${tokenHash}:${event.classId}:${event.buildCode}:${day}`;
  const claimed = await redis.set(dedupKey, 1, { nx: true, ex: COUNTER_TTL_SECONDS });
  if (claimed === null) return "duplicate";

  const stored: StoredBuildEvent = {
    type: event.type,
    classId: event.classId,
    buildCode: event.buildCode,
    tokenHash,
    ts: now,
  };
  await redis
    .pipeline()
    .rpush(RAW_EVENTS_KEY, stored)
    .ltrim(RAW_EVENTS_KEY, -RAW_EVENTS_MAX, -1)
    .exec();
  return "accepted";
}
