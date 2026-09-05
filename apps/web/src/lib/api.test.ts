import { afterEach, describe, expect, it, vi } from "vitest";
import {
  api,
  INVALID_JSON_MESSAGE,
  parseJsonSafe,
  TRUNCATED_JSON_MESSAGE,
} from "./api";

describe("parseJsonSafe", () => {
  it("parses complete JSON", () => {
    expect(parseJsonSafe('{"user":null}')).toEqual({ user: null });
  });

  it("maps unterminated string to a friendly truncated error", () => {
    const truncated = '{"user":{"id":"u1","name":"Ada"},"org":null,"role":null,"org';
    expect(() => JSON.parse(truncated)).toThrow(/Unterminated string/i);
    expect(() => parseJsonSafe(truncated)).toThrow(TRUNCATED_JSON_MESSAGE);
  });

  it("maps other SyntaxError to a friendly invalid-JSON error", () => {
    expect(() => parseJsonSafe("not-json")).toThrow(INVALID_JSON_MESSAGE);
  });
});

describe("api()", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not surface raw JSON.parse SyntaxError on a truncated 200", async () => {
    const truncated = '{"user":{"id":"u1"},"org":null,"role":null,"org';
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(truncated, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    await expect(api("/api/me")).rejects.toThrow(TRUNCATED_JSON_MESSAGE);
  });

  it("reads error.message from a JSON error body without throwing SyntaxError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ error: "sign_in_required" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    await expect(api("/api/command")).rejects.toThrow("sign_in_required");
  });
});
