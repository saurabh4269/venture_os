import { type NextRequest } from "next/server";
import {
  bffUpstreamError,
  fetchUpstream,
  resolveBffUpstream,
  rewriteAuthEmailBody,
} from "@/lib/bff-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const upstream = resolveBffUpstream({
      API_URL: process.env.API_URL,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
    });
    if (!upstream) return bffUpstreamError(502);

    const { path } = await ctx.params;
    const url = new URL(req.url);
    const target = `${upstream}/api/${path.join("/")}${url.search}`;
    const headers = new Headers();
    req.headers.forEach((v, k) => {
      if (!HOP.has(k.toLowerCase())) headers.set(k, v);
    });
    headers.set("x-forwarded-host", req.headers.get("host") ?? "");
    headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

    const init: RequestInit = {
      method: req.method,
      headers,
      redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const rewritten = await rewriteAuthEmailBody(path, req.headers.get("content-type") ?? "", () =>
        req.formData(),
      );
      if (rewritten) {
        init.body = rewritten.body;
        headers.set("content-type", rewritten.contentType);
      } else {
        init.body = Buffer.from(await req.arrayBuffer());
      }
    }

    return await fetchUpstream(target, init);
  } catch {
    return bffUpstreamError(502);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
