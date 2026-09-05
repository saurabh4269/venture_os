import { describe, expect, it } from "vitest";
import {
  BFF_UPSTREAM_TIMEOUT_MS,
  BFF_UPSTREAM_UNAVAILABLE,
  BFF_VERCEL_TIMEOUT_MS,
  bffFromUpstream,
  bffUpstreamError,
  classifyUpstreamFailure,
  fetchUpstream,
  resolveBffUpstream,
  rewriteAuthEmailBody,
  upstreamTimeoutMs,
} from "./bff-proxy";

describe("BFF proxy", () => {
  it("does not silently fall back to localhost when API_URL is unset in prod/Vercel", () => {
    expect(resolveBffUpstream({ NODE_ENV: "production" })).toBeNull();
    expect(resolveBffUpstream({ VERCEL: "1" })).toBeNull();
    expect(resolveBffUpstream({ NODE_ENV: "development" })).toBe("http://localhost:4000");
  });

  it("honors explicit localhost API_URL on next start (CI) but refuses it on Vercel", () => {
    expect(
      resolveBffUpstream({ NODE_ENV: "production", API_URL: "http://localhost:4000" }),
    ).toBe("http://localhost:4000");
    expect(resolveBffUpstream({ VERCEL: "1", API_URL: "http://127.0.0.1:4000" })).toBeNull();
    expect(resolveBffUpstream({ NODE_ENV: "production", API_URL: "https://api.example" })).toBe(
      "https://api.example",
    );
    expect(upstreamTimeoutMs({ VERCEL: "1" })).toBe(BFF_VERCEL_TIMEOUT_MS);
    expect(upstreamTimeoutMs({})).toBe(BFF_UPSTREAM_TIMEOUT_MS);
  });

  it("returns JSON 502/503 when upstream is missing or refused", async () => {
    const res = bffUpstreamError();
    expect(res.status).toBe(502);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
    expect(await res.json()).toEqual({ error: BFF_UPSTREAM_UNAVAILABLE });
    const refused = new Error("fetch failed");
    refused.cause = { code: "ECONNREFUSED", message: "connect ECONNREFUSED 127.0.0.1:4000" };
    expect(classifyUpstreamFailure(refused)).toBe(503);
    expect(classifyUpstreamFailure(new Error("connect ECONNREFUSED 127.0.0.1:4000"))).toBe(503);
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    expect(classifyUpstreamFailure(timeout)).toBe(503);
  });

  it("turns an uncaught fetch throw into JSON 503, not a broken Next body", async () => {
    const out = await fetchUpstream("http://127.0.0.1:4000/api/me", { method: "GET" }, async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:4000");
    });
    expect(out.status).toBe(503);
    expect(out.headers.get("content-type")).toContain("application/json");
    expect(out.headers.get("cache-control")).toMatch(/no-store/);
    const body = await out.text();
    expect(() => JSON.parse(body)).not.toThrow();
    expect(JSON.parse(body)).toEqual({ error: BFF_UPSTREAM_UNAVAILABLE });
  });

  it("buffers a decompressed body and drops the compressed content-length", async () => {
    const full = JSON.stringify({
      user: {
        id: "u1",
        name: "Ada Lovelace",
        email: "ada@firm.test",
        emailVerified: false,
        createdAt: "2026-09-05T10:00:00.000Z",
        updatedAt: "2026-09-05T10:00:00.000Z",
      },
      org: { id: "org_1", name: "V3 Ventures", slug: "v3-ventures", metadata: null },
      role: "org_admin",
      orgId: "org_1",
      needsOrg: false,
    });
    expect(full.length).toBeGreaterThan(137);
    const upstream = new Response(full, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": "137",
        "content-encoding": "gzip",
      },
    });
    const out = await bffFromUpstream(upstream);
    expect(out.headers.get("content-encoding")).toBeNull();
    expect(out.headers.get("content-length")).toBe(String(Buffer.byteLength(full)));
    const text = await out.text();
    expect(text).toBe(full);
    expect(text).not.toMatch(/,"org"$/);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text).user.email).toBe("ada@firm.test");
  });

  it("does not forward a stream that closed mid-JSON (Render back-to-back /api/me)", async () => {
    const truncated = '{"user":{"id":"u1","name":"Ada"},"org":null,"role":null,"org';
    expect(() => JSON.parse(truncated)).toThrow(/Unterminated string/i);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(truncated));
        controller.close();
      },
    });
    const out = await bffFromUpstream(
      new Response(stream, { status: 200, headers: { "content-type": "application/json" } }),
    );
    expect(out.status).toBe(502);
    expect(out.headers.get("content-type")).toContain("application/json");
    const body = await out.json();
    expect(body).toEqual({ error: BFF_UPSTREAM_UNAVAILABLE });
  });

  it("forwards a complete Better Auth signup JSON (does not 502)", async () => {
    const signup = JSON.stringify({
      token: "sess_1",
      user: {
        id: "u1",
        email: "e2e@example.test",
        name: "E2E",
        emailVerified: false,
        createdAt: "2026-09-05T10:00:00.000Z",
        updatedAt: "2026-09-05T10:00:00.000Z",
      },
    });
    const out = await bffFromUpstream(
      new Response(signup, {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "content-length": String(signup.length) },
      }),
    );
    expect(out.status).toBe(200);
    const text = await out.text();
    expect(text.length, `head=${text.slice(0, 80)} tail=${text.slice(-80)}`).toBeGreaterThan(80);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text).user.email).toBe("e2e@example.test");
  });

  it("rewrites multipart sign-up to JSON so Better Auth does not 415", async () => {
    const fd = new FormData();
    fd.set("email", "ada@firm.test");
    fd.set("password", "password12");
    fd.set("name", "Ada");
    const rewritten = await rewriteAuthEmailBody(
      ["auth", "sign-up", "email"],
      "multipart/form-data; boundary=----test",
      async () => fd,
    );
    expect(rewritten?.contentType).toBe("application/json");
    expect(JSON.parse(rewritten!.body)).toEqual({
      email: "ada@firm.test",
      password: "password12",
      name: "Ada",
    });
  });

  it("leaves JSON auth bodies alone", async () => {
    const rewritten = await rewriteAuthEmailBody(
      ["auth", "sign-in", "email"],
      "application/json",
      async () => new FormData(),
    );
    expect(rewritten).toBeNull();
  });
});
