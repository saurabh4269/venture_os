import { describe, expect, it, vi } from "vitest";
import { INVALID_JSON_MESSAGE, TRUNCATED_JSON_MESSAGE, UPSTREAM_UNAVAILABLE_MESSAGE } from "./api";
import {
  bookErrorMessage,
  isWakeError,
  nextWakeDelayMs,
  pingBookHealth,
  WAKE_AUTO_RETRY,
  WAKING_COPY,
} from "./wake";

describe("isWakeError", () => {
  it("treats cold-start and truncated book responses as wake, not sign-out", () => {
    expect(isWakeError(UPSTREAM_UNAVAILABLE_MESSAGE)).toBe(true);
    expect(isWakeError(TRUNCATED_JSON_MESSAGE)).toBe(true);
    expect(isWakeError(INVALID_JSON_MESSAGE)).toBe(true);
    expect(isWakeError("Failed to fetch")).toBe(true);
    expect(isWakeError("sign_in_required")).toBe(false);
  });
});

describe("bookErrorMessage", () => {
  it("maps wake errors to partner-grade copy and keeps other API errors", () => {
    expect(bookErrorMessage(UPSTREAM_UNAVAILABLE_MESSAGE)).toBe(WAKING_COPY.unreachable);
    expect(bookErrorMessage("period_locked")).toBe("period_locked");
  });
});

describe("nextWakeDelayMs", () => {
  it("grows then caps", () => {
    expect(nextWakeDelayMs(0)).toBe(WAKE_AUTO_RETRY.initialDelayMs);
    expect(nextWakeDelayMs(1)).toBeGreaterThan(nextWakeDelayMs(0));
    expect(nextWakeDelayMs(20)).toBe(WAKE_AUTO_RETRY.maxDelayMs);
  });
});

describe("pingBookHealth", () => {
  it("returns true only when upstream reports ok", async () => {
    const ok = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, service: "web" }), { status: 200 }),
    );
    await expect(pingBookHealth(ok as unknown as typeof fetch)).resolves.toBe(true);

    const cold = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: "upstream_unavailable" }), { status: 503 }),
    );
    await expect(pingBookHealth(cold as unknown as typeof fetch)).resolves.toBe(false);

    const boom = vi.fn(async () => {
      throw new Error("Failed to fetch");
    });
    await expect(pingBookHealth(boom as unknown as typeof fetch)).resolves.toBe(false);
  });
});
