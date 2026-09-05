import { type NextRequest } from "next/server";
import {
  bffFromUpstream,
  bffUpstreamError,
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
  const upstream = resolveBffUpstream();
  if (!upstream) return bffUpstreamError();

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
    const rewritten = await rewriteAuthEmailBody(path, req.headers.get("content-type") ?? "", () => req.formData());
    if (rewritten) {
      init.body = rewritten.body;
      headers.set("content-type", rewritten.contentType);
    } else {
      init.body = Buffer.from(await req.arrayBuffer());
    }
  }

  try {
    const res = await fetch(target, init);
    return await bffFromUpstream(res);
  } catch {
    return bffUpstreamError();
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
