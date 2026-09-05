import { describe, expect, it } from "vitest";
import { hasSessionCookie } from "./session-hint";

describe("hasSessionCookie", () => {
  it("is false with no cookies", () => {
    expect(hasSessionCookie([])).toBe(false);
  });

  it("detects Better Auth session cookies including __Secure- prefix", () => {
    expect(hasSessionCookie(["better-auth.session_token"])).toBe(true);
    expect(hasSessionCookie(["__Secure-better-auth.session_token"])).toBe(true);
    expect(hasSessionCookie(["__Host-better-auth.session_token"])).toBe(true);
  });

  it("ignores unrelated cookies", () => {
    expect(hasSessionCookie(["sidebar:state", "better-auth.csrf_token"])).toBe(false);
  });
});
