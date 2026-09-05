import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "./roles";

describe("friendlyAuthError", () => {
  it("maps password-length errors without treating 'admin' as too-short", () => {
    expect(friendlyAuthError("Password too short")).toBe("Password must be at least 8 characters.");
    expect(friendlyAuthError("Too small: expected string to have >=8 characters")).toBe(
      "Password must be at least 8 characters.",
    );
    expect(friendlyAuthError("org_admin_required")).toBe("org_admin_required");
  });

  it("keeps invalid-credential copy distinct from length", () => {
    expect(friendlyAuthError("Invalid email or password")).toMatch(/wrong/i);
  });

  it("maps truncated JSON and upstream 502 to a refreshable message", () => {
    expect(friendlyAuthError("Unterminated string in JSON at position 137")).toMatch(/truncated/i);
    expect(friendlyAuthError("upstream_unavailable")).toMatch(/unreachable/i);
  });
});
