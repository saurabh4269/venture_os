import { describe, expect, it } from "vitest";
import {
  BFF_UPSTREAM_UNAVAILABLE,
  bffFromUpstream,
  bffUpstreamError,
  resolveBffUpstream,
  rewriteAuthEmailBody,
} from "./bff-proxy";

describe("BFF proxy", () => {
  it("does not fall back to localhost in production", () => {
    expect(resolveBffUpstream({ NODE_ENV: "production" })).toBeNull();
    expect(resolveBffUpstream({ NODE_ENV: "production", API_URL: "https://api.example" })).toBe(
      "https://api.example",
    );
    expect(resolveBffUpstream({ NODE_ENV: "development" })).toBe("http://localhost:4000");
  });

  it("returns JSON 502 when upstream is missing", async () => {
    const res = bffUpstreamError();
    expect(res.status).toBe(502);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: BFF_UPSTREAM_UNAVAILABLE });
  });

  it("buffers a decompressed body and drops the compressed content-length", async () => {
    const full = JSON.stringify({
      user: { id: "u1", name: "Ada", email: "ada@firm.test" },
      org: null,
      role: null,
      orgId: null,
      needsOrg: true,
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
    expect(out.headers.get("content-length")).not.toBe("137");
    const text = await out.text();
    expect(text).toBe(full);
    expect(text).not.toMatch(/,"org"$/);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text).user.email).toBe("ada@firm.test");
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
