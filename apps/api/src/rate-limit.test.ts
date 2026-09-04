import { describe, expect, it } from "vitest";
import { allowRequest, allowRequestShared, getRateLimitRedis, resetRateLimitForTests } from "./rate-limit.js";

describe("auth rate-limit memory fallback", () => {
  it("allows under the limit and refuses after", () => {
    resetRateLimitForTests();
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(allowRequest("ip:1", 3, 60_000, now + i)).toBe(true);
    }
    expect(allowRequest("ip:1", 3, 60_000, now + 10)).toBe(false);
    expect(allowRequest("ip:2", 3, 60_000, now)).toBe(true);
  });

  it("resets after the window", () => {
    resetRateLimitForTests();
    expect(allowRequest("ip:w", 1, 1000, 0)).toBe(true);
    expect(allowRequest("ip:w", 1, 1000, 500)).toBe(false);
    expect(allowRequest("ip:w", 1, 1000, 1001)).toBe(true);
  });
});

describe("auth rate-limit Redis window", () => {
  it("refuses after the shared limit when Redis is up", async () => {
    const client = getRateLimitRedis();
    if (!client) return;
    try {
      if (client.status === "wait") await client.connect();
      await client.ping();
    } catch {
      return;
    }
    process.env.RATE_LIMIT_REDIS = "1";
    const key = `test:${Date.now()}:${Math.random()}`;
    expect(await allowRequestShared(key, 2, 60_000)).toBe(true);
    expect(await allowRequestShared(key, 2, 60_000)).toBe(true);
    expect(await allowRequestShared(key, 2, 60_000)).toBe(false);
    delete process.env.RATE_LIMIT_REDIS;
  });
});
