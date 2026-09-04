/** In-memory sliding window. Stub — not Redis, not multi-instance. Auth only. */

type Bucket = { times: number[] };

const buckets = new Map<string, Bucket>();

export function allowRequest(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key) ?? { times: [] };
  b.times = b.times.filter((t) => now - t < windowMs);
  if (b.times.length >= limit) {
    buckets.set(key, b);
    return false;
  }
  b.times.push(now);
  buckets.set(key, b);
  return true;
}

export function resetRateLimitForTests() {
  buckets.clear();
}

export const AUTH_RATE_LIMIT = 20;
export const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
