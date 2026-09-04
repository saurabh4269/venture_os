import { describe, expect, it } from "vitest";
import { applyCorrectionLedger } from "./corrections.js";

describe("correction ledger", () => {
  it("reapplies an active patch on a re-extracted proposal", () => {
    const proposed = {
      metricKey: "cash",
      periodStart: "2025-08-01",
      periodEnd: "2025-08-31",
      valueNumeric: 3.1,
      unit: "crore",
      currency: "INR",
      excerpt: "Cash → 3.1",
      confidence: 0.8,
    };
    const out = applyCorrectionLedger(proposed, [
      {
        metricKey: "cash",
        periodStart: "2025-08-01",
        periodEnd: "2025-08-31",
        patchedValue: 4.2,
        patchedUnit: "crore",
        patchedCurrency: "INR",
      },
    ]);
    expect(out.valueNumeric).toBe(4.2);
    expect(out.excerpt).toContain("correction ledger applied");
    expect(out.confidence).toBe(0.99);
  });

  it("does not invent a patch for a different period", () => {
    const proposed = {
      metricKey: "cash",
      periodStart: "2025-09-01",
      periodEnd: "2025-09-30",
      valueNumeric: 3.1,
      unit: "crore",
      currency: "INR",
      excerpt: "Cash → 3.1",
      confidence: 0.8,
    };
    const out = applyCorrectionLedger(proposed, [
      {
        metricKey: "cash",
        periodStart: "2025-08-01",
        periodEnd: "2025-08-31",
        patchedValue: 4.2,
        patchedUnit: "crore",
        patchedCurrency: "INR",
      },
    ]);
    expect(out.valueNumeric).toBe(3.1);
    expect(out.excerpt).toBe("Cash → 3.1");
  });
});
