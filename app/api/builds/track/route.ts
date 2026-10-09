import { parseBuildEventPayload } from "@/lib/build-events";
import { isLocalRequest, recordBuildEvent } from "@/lib/build-tracking-server";

export const runtime = "nodejs";

// Tracking is best-effort: the browser never reads this response, and nothing
// here should ever surface an error to the visitor. Malformed input and builds
// the planner couldn't produce answer 400, a rate-limited request 429, and
// everything else (including any failure) 204, so it can't become a signal.
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

    // A local server (next dev or next start against .env.local) would
    // otherwise write to the production database. See isLocalRequest.
    if (isLocalRequest(request)) return new Response(null, { status: 204 });

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

    const result = await recordBuildEvent(payload, ip);
    if (result === "invalid-build") return new Response(null, { status: 400 });
    return new Response(null, { status: result === "rate-limited" ? 429 : 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
