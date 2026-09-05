import { applyUpstreamHeaders, BFF_CACHE_CONTROL } from "./bff-headers";

export const BFF_UPSTREAM_UNAVAILABLE = "upstream_unavailable";
/** Stay under Vercel Hobby's 10s cap so we return JSON 503 instead of a killed function. */
export const BFF_UPSTREAM_TIMEOUT_MS = 8_000;

type EnvLike = {
  API_URL?: string;
  BETTER_AUTH_URL?: string;
  NODE_ENV?: string;
  VERCEL?: string;
};

function hostedRuntime(env: EnvLike): boolean {
  return env.NODE_ENV === "production" || env.VERCEL === "1" || env.VERCEL === "true";
}

function loopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return true;
  }
}

/**
 * Production / Vercel must set a public API_URL. Never silently proxy to
 * localhost:4000 there — that is the ECONNREFUSED path in Vercel logs.
 */
export function resolveBffUpstream(env: EnvLike = process.env): string | null {
  const url = (env.API_URL || env.BETTER_AUTH_URL || "").replace(/\/$/, "");
  if (hostedRuntime(env)) {
    if (!url || loopbackUrl(url)) return null;
    return url;
  }
  return url || "http://localhost:4000";
}

export function bffUpstreamError(status: 502 | 503 = 502): Response {
  return new Response(JSON.stringify({ error: BFF_UPSTREAM_UNAVAILABLE }), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": BFF_CACHE_CONTROL,
    },
  });
}

export function classifyUpstreamFailure(err: unknown): 502 | 503 {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    if (cur instanceof Error) {
      parts.push(cur.name, cur.message);
      const code = (cur as Error & { code?: string }).code;
      if (code) parts.push(code);
      cur = cur.cause;
      continue;
    }
    if (cur && typeof cur === "object") {
      const rec = cur as { code?: string; message?: string };
      if (rec.code) parts.push(rec.code);
      if (rec.message) parts.push(rec.message);
    } else {
      parts.push(String(cur));
    }
    break;
  }
  const blob = parts.join(" ");
  if (/TimeoutError|AbortError|timeout|aborted/i.test(blob)) return 503;
  if (/ECONNREFUSED|ENOTFOUND|ECONNRESET|EAI_AGAIN|EHOSTUNREACH|fetch failed/i.test(blob)) return 503;
  return 502;
}

/**
 * Copy a decompressed upstream response. Buffer the body so a stale
 * compressed Content-Length cannot truncate the stream.
 */
export async function bffFromUpstream(res: Response): Promise<Response> {
  const buf = await res.arrayBuffer();
  const out = new Headers();
  applyUpstreamHeaders(res.headers, out);
  return new Response(buf, { status: res.status, headers: out });
}

export async function fetchUpstream(
  target: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  try {
    const res = await fetchImpl(target, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(BFF_UPSTREAM_TIMEOUT_MS),
    });
    return await bffFromUpstream(res);
  } catch (err) {
    return bffUpstreamError(classifyUpstreamFailure(err));
  }
}

const AUTH_EMAIL = new Set(["sign-up", "sign-in"]);

/** Better Auth rejects multipart; rewrite email auth to JSON before proxying. */
export async function rewriteAuthEmailBody(
  path: string[],
  contentType: string,
  formData: () => Promise<FormData>,
): Promise<{ body: string; contentType: string } | null> {
  if (path[0] !== "auth" || !AUTH_EMAIL.has(path[1] ?? "") || path[2] !== "email") return null;
  if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) {
    return null;
  }
  if (contentType.includes("application/x-www-form-urlencoded")) return null;
  const fd = await formData();
  const name = fd.get("name");
  const payload: { email: string; password: string; name?: string } = {
    email: String(fd.get("email") ?? ""),
    password: String(fd.get("password") ?? ""),
  };
  if (name != null && String(name)) payload.name = String(name);
  return { body: JSON.stringify(payload), contentType: "application/json" };
}
