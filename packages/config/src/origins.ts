export type OriginEnv = {
  WEB_URL: string;
  API_URL: string;
  WEB_ORIGIN_PATTERNS?: string;
};

export function parseOriginPatterns(raw?: string): string[] {
  return (raw ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** One `*` matches a single DNS label (e.g. `https://*.vercel.app`). */
export function originMatches(origin: string, pattern: string): boolean {
  const o = origin.replace(/\/$/, "");
  const p = pattern.replace(/\/$/, "");
  if (p === o) return true;
  if (!p.includes("*")) return false;
  const escaped = p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^.]+");
  return new RegExp(`^${escaped}$`, "i").test(o);
}

export function collectTrustedOrigins(env: OriginEnv): string[] {
  const base = [
    env.WEB_URL.replace(/\/$/, ""),
    env.API_URL.replace(/\/$/, ""),
    "http://localhost:3000",
    "http://localhost:4000",
  ];
  return [...new Set([...base, ...parseOriginPatterns(env.WEB_ORIGIN_PATTERNS)])];
}

export function isTrustedOrigin(origin: string | undefined, env: OriginEnv): boolean {
  if (!origin) return false;
  const o = origin.replace(/\/$/, "");
  for (const p of collectTrustedOrigins(env)) {
    if (originMatches(o, p)) return true;
  }
  return false;
}
