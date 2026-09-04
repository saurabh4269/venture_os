import { describe, expect, it } from "vitest";
import {
  canonicalizeRole,
  isAdminRole,
  isConfirmRole,
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
