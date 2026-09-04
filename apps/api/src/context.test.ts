import { describe, expect, it } from "vitest";
import { canConfirm } from "./context.js";

describe("canConfirm", () => {
  it("allows the locked write roles and BA aliases", () => {
    expect(canConfirm("org_admin")).toBe(true);
    expect(canConfirm("partner")).toBe(true);
    expect(canConfirm("analyst")).toBe(true);
    expect(canConfirm("owner")).toBe(true);
  });

  it("refuses viewer and missing role", () => {
    expect(canConfirm("viewer")).toBe(false);
    expect(canConfirm(null)).toBe(false);
    expect(canConfirm("intern")).toBe(false);
  });
});
