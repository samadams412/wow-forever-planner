// Browser side of build tracking. Fire-and-forget: every call returns
// immediately, nothing is awaited by the caller, and any failure (no storage,
// blocked network, rate limit) is swallowed so the action that triggered it
// behaves exactly the same.
import type { BuildEventType } from "@/lib/build-events";

const TOKEN_STORAGE_KEY = "forevercraft:anon-token";
const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

// Random per-browser token. Stored in localStorage (not a cookie) so it never
// rides along on page requests. Returns null if storage is unavailable, in
// which case no event is sent at all.
function getOrCreateToken(): string | null {
  try {
    const existing = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (existing && TOKEN_PATTERN.test(existing)) return existing;
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return token;
  } catch {
    return null;
  }
}

export function trackBuildEvent(type: BuildEventType, classId: string, buildCode: string): void {
  try {
    const token = getOrCreateToken();
    if (!token) return;
    const body = JSON.stringify({ type, classId, buildCode, token });
    // sendBeacon queues the request for the browser to send in the background,
    // so it adds no latency to the click. fetch+keepalive is the fallback.
    const queued = navigator.sendBeacon?.(
      "/api/builds/track",
      new Blob([body], { type: "application/json" }),
    );
    if (queued) return;
    void fetch("/api/builds/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking must never affect the action it's attached to.
  }
}
