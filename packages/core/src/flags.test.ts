import { describe, expect, it } from "vitest";
import {
  detectBurnUp,
  detectCashUnreported,
  detectGmCompression,
  detectMarkStale,
  detectMisLate,
  detectPlanVariance,
  detectRunwayShort,
  detectSpendWithoutRevenue,
} from "./flags.js";

describe("flag detectors", () => {
  it("does not raise runway_short without both cash and burn", () => {
    expect(detectRunwayShort(null, 2)).toBeNull();
    expect(detectRunwayShort(4, null)).toBeNull();
  });

  it("raises runway_short only when computed runway is below threshold", () => {
    const hit = detectRunwayShort(4, 2, 6);
    expect(hit?.flagKey).toBe("runway_short");
    expect(hit?.evidence.runwayMonths).toBe(2);
    expect(detectRunwayShort(20, 2, 6)).toBeNull();
  });

  it("does not raise burn_up when prior burn is missing (missing ≠ 0)", () => {
    expect(detectBurnUp(5, null)).toBeNull();
    expect(detectBurnUp(null, 2)).toBeNull();
  });

  it("raises burn_up when increase exceeds threshold", () => {
    expect(detectBurnUp(3, 2, 0.2)?.flagKey).toBe("burn_up");
    expect(detectBurnUp(2.1, 2, 0.2)).toBeNull();
  });

  it("does not invent GM compression from a missing prior", () => {
    expect(detectGmCompression(0.4, null)).toBeNull();
  });

  it("raises GM compression when drop exceeds threshold", () => {
    expect(detectGmCompression(0.32, 0.4, 0.03)?.flagKey).toBe("gm_compression");
  });

  it("plan variance requires both actual and plan, and only fires below plan", () => {
    expect(detectPlanVariance(8, null)).toBeNull();
    expect(detectPlanVariance(8, 10, 0.15)?.flagKey).toBe("plan_variance");
    expect(detectPlanVariance(9, 10, 0.15)).toBeNull();
    expect(detectPlanVariance(12, 10, 0.15)).toBeNull();
  });

  it("mis_late grants grace to a newly created company with no MIS yet", () => {
    const asOf = new Date("2026-09-04T00:00:00Z");
    expect(
      detectMisLate(null, asOf, 45, { companyCreatedAt: "2026-09-01T00:00:00Z" }),
    ).toBeNull();
    expect(detectMisLate(null, asOf, 45, { companyCreatedAt: "2026-01-01T00:00:00Z" })?.flagKey).toBe(
      "mis_late",
    );
  });

  it("cash_unreported fires when prior cash exists and current is missing — not zero", () => {
    const hit = detectCashUnreported(4.2, null);
    expect(hit?.flagKey).toBe("cash_unreported");
    expect(hit?.evidence.currentCash).toBeNull();
    expect(detectCashUnreported(4.2, 0)).toBeNull(); // 0 is a reported number
    expect(detectCashUnreported(null, null)).toBeNull();
  });

  it("mark_stale is low when never marked and silent inside the stale window", () => {
    const asOf = new Date("2026-09-04T00:00:00Z");
    expect(detectMarkStale(null, asOf)?.severity).toBe("low");
    expect(detectMarkStale("2026-08-01", asOf, 100)).toBeNull();
    expect(detectMarkStale("2026-01-01", asOf, 100)?.flagKey).toBe("mark_stale");
  });

  it("spend_without_revenue needs both burn up and flat/down revenue — missing is not 0 growth", () => {
    expect(detectSpendWithoutRevenue(3, 2, null, 10)).toBeNull();
    expect(detectSpendWithoutRevenue(3, 2, 12, 10)).toBeNull();
    expect(detectSpendWithoutRevenue(3, 2, 10, 10)?.flagKey).toBe("spend_without_revenue");
  });
});
