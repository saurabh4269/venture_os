import { describe, expect, it } from "vitest";
import {
  canonicalizeRole,
  invitationExpired,
  isAdminRole,
  isConfirmRole,
  isLockRole,
  isWriteRole,
  roleLabel,
  slugifyOrg,
} from "./index.js";

describe("roles", () => {
  it("canonicalizes Better Auth aliases onto the locked set", () => {
    expect(canonicalizeRole("org_admin")).toBe("org_admin");
    expect(canonicalizeRole("owner")).toBe("org_admin");
    expect(canonicalizeRole("admin")).toBe("org_admin");
    expect(canonicalizeRole("member")).toBe("analyst");
    expect(canonicalizeRole("viewer")).toBe("viewer");
    expect(canonicalizeRole("ghost")).toBeNull();
  });

  it("viewer cannot write or confirm; org_admin can", () => {
    expect(isWriteRole("viewer")).toBe(false);
    expect(isConfirmRole("viewer")).toBe(false);
    expect(isAdminRole("viewer")).toBe(false);
    expect(isWriteRole("analyst")).toBe(true);
    expect(isConfirmRole("partner")).toBe(true);
    expect(isAdminRole("org_admin")).toBe(true);
    expect(isAdminRole("owner")).toBe(true);
    expect(isLockRole("partner")).toBe(true);
    expect(isLockRole("org_admin")).toBe(true);
    expect(isLockRole("analyst")).toBe(false);
    expect(isLockRole("viewer")).toBe(false);
  });

  it("treats invite expiry as a hard gate — missing date is not expired", () => {
    expect(invitationExpired("2020-01-01T00:00:00.000Z", new Date("2026-09-04T00:00:00Z"))).toBe(true);
    expect(invitationExpired("2026-12-01T00:00:00.000Z", new Date("2026-09-04T00:00:00Z"))).toBe(false);
    expect(invitationExpired(null)).toBe(false);
  });

  it("labels every underscore, not only the first", () => {
    expect(roleLabel("org_admin")).toBe("Org Admin");
    expect(roleLabel(null)).toBe("—");
  });
});

describe("slugifyOrg", () => {
  it("produces a url-safe slug and empty for symbols-only names", () => {
    expect(slugifyOrg("V3 Ventures")).toBe("v3-ventures");
    expect(slugifyOrg("@@@")).toBe("");
    expect(slugifyOrg("  Alpha—Beta  ")).toBe("alpha-beta");
  });
});
