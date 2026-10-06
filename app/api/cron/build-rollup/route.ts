import { runBuildRollup } from "@/lib/build-rollup";

export const runtime = "nodejs";

// Invoked daily by Vercel Cron (see vercel.json). Vercel sends
// Authorization: Bearer <CRON_SECRET>; anything else is refused.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const summary = await runBuildRollup();
  return Response.json(summary);
}
