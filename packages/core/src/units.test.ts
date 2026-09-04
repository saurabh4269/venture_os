import { describe, expect, it } from "vitest";
import { detectUnit, toEur, toInrCrore } from "./units.js";

describe("units", () => {
  it("converts lakh → crore and refuses unknown", () => {
    expect(toInrCrore(250, "lakh", "INR")).toBe(2.5);
    expect(toInrCrore(3, "crore", "INR")).toBe(3);
    expect(toInrCrore(3, "unknown", "INR")).toBeNull();
    expect(toInrCrore(3, "crore", "USD")).toBeNull();
  });

  it("EUR conversion requires a complete FX triple", () => {
    expect(toEur(10, "INR", { fxRate: 0.011, fxDate: "2026-09-01", fxSource: "RBI" })).toBeCloseTo(
      0.11,
    );
    expect(toEur(10, "INR", { fxRate: 0.011, fxDate: "2026-09-01" })).toBeNull();
    expect(toEur(10, "INR", { fxRate: 0.011, fxSource: "RBI" })).toBeNull();
    expect(toEur(null, "INR", { fxRate: 0.011, fxDate: "2026-09-01", fxSource: "RBI" })).toBeNull();
  });

  it("ambiguous unit tokens are not guessed", () => {
    expect(detectUnit("Revenue (INR Cr / lakh mixed)")).toBe("ambiguous");
    expect(detectUnit("Revenue (INR Cr)")).toBe("crore");
    expect(detectUnit("headcount")).toBe("unknown");
  });
});
