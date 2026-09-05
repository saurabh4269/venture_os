import { BFF_CACHE_CONTROL } from "@/lib/bff-headers";
import { resolveBffUpstream, upstreamTimeoutMs } from "@/lib/bff-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const headers = {
  "content-type": "application/json",
  "cache-control": BFF_CACHE_CONTROL,
};

/**
 * Same-origin liveness for keep-alive pings. Proxies the API `/health`
 * (not `/api/health`) so an external monitor can hit the web host.
 */
export async function GET() {
  const upstream = resolveBffUpstream({
    API_URL: process.env.API_URL,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  });
  if (!upstream) {
    return Response.json({ ok: false, service: "web", error: "upstream_unavailable" }, { status: 502, headers });
  }
  try {
    const res = await fetch(`${upstream}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(upstreamTimeoutMs()),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json(
      { ...(data ?? {}), ok: Boolean(data && data.ok === true), service: "web" },
      { status: res.ok && data?.ok === true ? 200 : 503, headers },
    );
  } catch {
    return Response.json({ ok: false, service: "web", error: "upstream_unavailable" }, { status: 503, headers });
  }
}
