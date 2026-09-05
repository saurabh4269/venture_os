/** Session GETs must not be stored as a public anonymous snapshot. */
export const BFF_CACHE_CONTROL = "private, no-store";

/**
 * Hop-by-hop + length/encoding. Node `fetch` decompresses upstream gzip;
 * forwarding the compressed `content-length` makes the browser stop mid-JSON
 * (`Unterminated string in JSON at position N`).
 */
const DROP = new Set([
  "transfer-encoding",
  "content-encoding",
  "content-length",
  "set-cookie",
]);
const DROP_CACHE = new Set(["cache-control", "etag", "expires", "age", "pragma"]);

export function stripCookieDomain(cookie: string): string {
  return cookie.replace(/;\s*domain=[^;]+/i, "");
}

/** Copy upstream headers and force a private, uncached session-safe response. */
export function applyUpstreamHeaders(src: Headers, out: Headers): void {
  src.forEach((v, k) => {
    const key = k.toLowerCase();
    if (DROP.has(key) || DROP_CACHE.has(key)) return;
    out.append(k, v);
  });
  out.set("cache-control", BFF_CACHE_CONTROL);
  out.set("vary", mergeVary(out.get("vary"), "Cookie"));
  const cookies = typeof src.getSetCookie === "function" ? src.getSetCookie() : [];
  for (const c of cookies) {
    out.append("set-cookie", stripCookieDomain(c));
  }
}

function mergeVary(existing: string | null, extra: string): string {
  const parts = new Set(
    `${existing ?? ""},${extra}`
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return [...parts].join(", ");
}
