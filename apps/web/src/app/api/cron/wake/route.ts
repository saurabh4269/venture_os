import { BFF_CACHE_CONTROL } from "@/lib/bff-headers";
import { resolveBffUpstream, upstreamTimeoutMs } from "@/lib/bff-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Optional Vercel Cron (Hobby: once daily). Prefer a 10-minute GET to `/api/health`. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json", "cache-control": BFF_CACHE_CONTROL },
    });
  }
  const upstream = resolveBffUpstream({
    API_URL: process.env.API_URL,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  });
  if (!upstream) {
    return Response.json(
      { ok: false, error: "upstream_unavailable" },
      { status: 502, headers: { "cache-control": BFF_CACHE_CONTROL } },
    );
  }
  try {
    const res = await fetch(`${upstream}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(upstreamTimeoutMs()),
    });
    const health = await res.json().catch(() => null);
    return Response.json(
      { ok: res.ok, health },
      { status: res.ok ? 200 : 503, headers: { "cache-control": BFF_CACHE_CONTROL } },
    );
  } catch {
    return Response.json(
      { ok: false, error: "upstream_unavailable" },
      { status: 503, headers: { "cache-control": BFF_CACHE_CONTROL } },
    );
  }
}
