/** Auth rate-limit. Redis sliding window when reachable; in-memory fallback. */

import Redis from "ioredis";
import { loadEnv } from "@venture-os/config";

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

let redis: Redis | null | undefined;

export function getRateLimitRedis(): Redis | null {
  if (redis !== undefined) return redis;
  try {
    const env = loadEnv();
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 800,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on("error", () => {
      /* fallback path logs at call site */
    });
    redis = client;
    return client;
  } catch {
    redis = null;
    return null;
  }
}

/** Atomic sliding window. 1 = allow, 0 = refuse. */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local n = redis.call('ZCARD', key)
if n >= limit then
  return 0
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return 1
`;

async function redisAllow(client: Redis, key: string, limit: number, windowMs: number, now: number): Promise<boolean> {
  if (client.status === "wait") await client.connect();
  const allowed = await client.eval(SLIDING_WINDOW_LUA, 1, `rl:${key}`, String(now), String(windowMs), String(limit), `${now}:${Math.random()}`);
  return Number(allowed) === 1;
}

/**
 * Shared limiter. Tries Redis first (multi-instance). On timeout / down, uses the
 * in-process window so a Redis blip does not 500 signup.
 */
export async function allowRequestShared(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<boolean> {
  // Vitest HTTP files share one Redis IP key with each other and with Playwright
  // if we count in Redis. Keep the in-process window during `vitest`; the Redis
  // path is covered by the dedicated unit test (`RATE_LIMIT_REDIS=1`).
  if (process.env.VITEST && process.env.RATE_LIMIT_REDIS !== "1") {
    return allowRequest(key, limit, windowMs, now);
  }
  const client = getRateLimitRedis();
  if (client) {
    try {
      return await Promise.race([
        redisAllow(client, key, limit, windowMs, now),
        new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error("redis_timeout")), 800);
        }),
      ]);
    } catch {
      /* fall through */
    }
  }
  return allowRequest(key, limit, windowMs, now);
}
