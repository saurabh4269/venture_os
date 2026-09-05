import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH } from "@venture-os/config/password";
import { destinationAfterAuth, normalizeEmail, passwordLengthError, readAuthForm } from "./auth-form";
import type { Me } from "./auth-client";

const emptyMe: Me = { user: null, org: null, role: null, orgId: null, needsOrg: false };

describe("auth form + session routing", () => {
  it("normalizes email the same way for signup and sign-in", () => {
    expect(normalizeEmail("  Analyst@Firm.TEST ")).toBe("analyst@firm.test");
  });

  it("uses the same 8+ floor on both paths", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(passwordLengthError("1234567")).toBe("Password must be at least 8 characters.");
    expect(passwordLengthError("12345678")).toBeNull();
    expect(passwordLengthError("password123")).toBeNull();
  });

  it("reads password from FormData so autofill is not lost", () => {
    const fd = new FormData();
    fd.set("email", "  User@Firm.test ");
    fd.set("password", "12345678");
    expect(readAuthForm(fd)).toMatchObject({ email: "user@firm.test", password: "12345678" });
  });

  it("does not send a cookieless session to onboard (silent login loop)", () => {
    const dest = destinationAfterAuth(emptyMe, "/command");
    expect(dest.ok).toBe(false);
    if (!dest.ok) expect(dest.message).toMatch(/session was not kept/i);
  });

  it("routes a signed-in user without an org to onboard", () => {
    const dest = destinationAfterAuth(
      {
        user: { id: "u1", name: "Ada", email: "ada@firm.test" },
        org: null,
        role: null,
        orgId: null,
        needsOrg: true,
      },
      "/command",
    );
    expect(dest).toEqual({ ok: true, to: "/onboard" });
  });

  it("routes a member to the safe next path", () => {
    const dest = destinationAfterAuth(
      {
        user: { id: "u1", name: "Ada", email: "ada@firm.test" },
        org: { id: "o1", name: "Firm" },
        role: "org_admin",
        orgId: "o1",
        needsOrg: false,
      },
      "/flags",
    );
    expect(dest).toEqual({ ok: true, to: "/flags" });
  });
});
