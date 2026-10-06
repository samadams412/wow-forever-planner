// Anonymous build-interaction events (shared / saved / opened). Shared by the
// browser (which builds the payload) and the server (which validates it, hashes
// the token, and stores it). Nothing in here identifies a person: the token is
// random per browser, and the server only ever stores a keyed hash of it.
import { CLASS_ICON } from "@/lib/wow-data";

export const BUILD_EVENT_TYPES = ["shared", "saved", "opened"] as const;
export type BuildEventType = (typeof BUILD_EVENT_TYPES)[number];

// What the browser sends to POST /api/builds/track.
export type BuildEventPayload = {
  type: BuildEventType;
  classId: string;
  buildCode: string;
  // 32 lowercase hex chars, generated client-side and kept in localStorage.
  token: string;
};

// What the server queues in Redis after validating and hashing. The raw token
// is never part of this shape.
export type StoredBuildEvent = {
  type: BuildEventType;
  classId: string;
  buildCode: string;
  tokenHash: string;
  // Epoch milliseconds, set by the server when the event is accepted.
  ts: number;
};

// Raw events are a capped Redis list, drained by the daily rollup. The cap
// bounds memory if the rollup stops running; the retention window bounds how
// long any single raw event can survive.
export const RAW_EVENTS_KEY = "builds:events:raw";
export const RAW_EVENTS_MAX = 100_000;
export const RAW_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;
const BUILD_CODE_PATTERN = /^[0-9a-z-]{1,200}$/;
const MAX_BUILD_CODE_LENGTH = 200;

export function isBuildEventType(value: unknown): value is BuildEventType {
  return typeof value === "string" && (BUILD_EVENT_TYPES as readonly string[]).includes(value);
}

// Validates an untrusted request body. Returns null for anything malformed,
// so the route can reject it without touching storage.
export function parseBuildEventPayload(body: unknown): BuildEventPayload | null {
  if (!body || typeof body !== "object") return null;
  const { type, classId, buildCode, token } = body as Record<string, unknown>;
  if (!isBuildEventType(type)) return null;
  if (typeof classId !== "string" || !(classId in CLASS_ICON)) return null;
  if (typeof buildCode !== "string" || buildCode.length > MAX_BUILD_CODE_LENGTH) return null;
  if (!BUILD_CODE_PATTERN.test(buildCode)) return null;
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return null;
  return { type, classId, buildCode, token };
}
