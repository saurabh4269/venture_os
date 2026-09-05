import { describe, expect, it } from "vitest";
import { BFF_CACHE_CONTROL, applyUpstreamHeaders, stripCookieDomain } from "./bff-headers";

describe("BFF session headers", () => {
  it("strips Domain so the browser stores the cookie on the web host", () => {
    expect(
      stripCookieDomain(
        "__Secure-better-auth.session_token=abc; Domain=api.example; Path=/; HttpOnly; Secure; SameSite=Lax",
      ),
    ).toBe("__Secure-better-auth.session_token=abc; Path=/; HttpOnly; Secure; SameSite=Lax");
  });

  it("forces private no-store and drops public/etag so /api/me cannot 304 as anonymous", () => {
    const src = new Headers({
      "content-type": "application/json",
      "cache-control": "public, max-age=0, must-revalidate",
      etag: '"stale-anonymous"',
      expires: "Wed, 21 Oct 2015 07:28:00 GMT",
      age: "0",
      vary: "Origin",
    });
    src.append(
      "set-cookie",
      "__Secure-better-auth.session_token=tok; Domain=onrender.com; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    const out = new Headers();
    applyUpstreamHeaders(src, out);
    expect(out.get("cache-control")).toBe(BFF_CACHE_CONTROL);
    expect(out.get("etag")).toBeNull();
    expect(out.get("expires")).toBeNull();
    expect(out.get("vary")?.toLowerCase()).toContain("cookie");
    expect(out.get("content-type")).toBe("application/json");
    const cookies = out.getSetCookie();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).not.toMatch(/domain=/i);
    expect(cookies[0]).toContain("__Secure-better-auth.session_token=tok");
  });

  it("never forwards upstream content-length or content-encoding after decompress", () => {
    const src = new Headers({
      "content-type": "application/json",
      "content-length": "137",
      "content-encoding": "gzip",
      "transfer-encoding": "chunked",
    });
    const out = new Headers();
    applyUpstreamHeaders(src, out);
    expect(out.get("content-length")).toBeNull();
    expect(out.get("content-encoding")).toBeNull();
    expect(out.get("transfer-encoding")).toBeNull();
    expect(out.get("content-type")).toBe("application/json");
  });
});
