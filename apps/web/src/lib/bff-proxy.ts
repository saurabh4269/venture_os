import { applyUpstreamHeaders, BFF_CACHE_CONTROL } from "./bff-headers";

export const BFF_UPSTREAM_UNAVAILABLE = "upstream_unavailable";

type EnvLike = {
  API_URL?: string;
  BETTER_AUTH_URL?: string;
  NODE_ENV?: string;
};

/** Production must set API_URL (or BETTER_AUTH_URL). Never fall back to localhost there. */
export function resolveBffUpstream(env: EnvLike = process.env): string | null {
  const url = (env.API_URL || env.BETTER_AUTH_URL || "").replace(/\/$/, "");
  if (url) return url;
  if (env.NODE_ENV === "production") return null;
  return "http://localhost:4000";
}

export function bffUpstreamError(status = 502): Response {
  return new Response(JSON.stringify({ error: BFF_UPSTREAM_UNAVAILABLE }), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": BFF_CACHE_CONTROL,
    },
  });
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
