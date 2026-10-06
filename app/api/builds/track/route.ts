import { parseBuildEventPayload } from "@/lib/build-events";
import { recordBuildEvent } from "@/lib/build-tracking-server";

export const runtime = "nodejs";

// Tracking is best-effort: the browser never reads this response, and nothing
// here should ever surface an error to the visitor. Every failure path still
// answers 204 (or 429 for a rate-limited request) so it can't become a signal.
export async function POST(request: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(null, { status: 400 });
    }
    const payload = parseBuildEventPayload(body);
    if (!payload) return new Response(null, { status: 400 });

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

    const result = await recordBuildEvent(payload, ip);
    return new Response(null, { status: result === "rate-limited" ? 429 : 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
