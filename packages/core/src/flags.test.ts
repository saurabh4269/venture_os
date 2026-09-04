import { describe, expect, it } from "vitest";
import {
  detectBurnUp,
  detectCashUnreported,
  detectGmCompression,
  detectPlanVariance,
  detectRunwayShort,
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

  it("plan variance requires both actual and plan", () => {
    expect(detectPlanVariance(8, null)).toBeNull();
    expect(detectPlanVariance(8, 10, 0.15)?.flagKey).toBe("plan_variance");
    expect(detectPlanVariance(9, 10, 0.15)).toBeNull();
  });

  it("cash_unreported fires when prior cash exists and current is missing — not zero", () => {
    const hit = detectCashUnreported(4.2, null);
    expect(hit?.flagKey).toBe("cash_unreported");
    expect(hit?.evidence.currentCash).toBeNull();
    expect(detectCashUnreported(4.2, 0)).toBeNull(); // 0 is a reported number
    expect(detectCashUnreported(null, null)).toBeNull();
  });
});
