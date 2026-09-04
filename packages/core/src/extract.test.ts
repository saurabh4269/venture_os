import { describe, expect, it } from "vitest";
import { extractFromRows } from "./extract.js";

describe("extract", () => {
  it("maps known labels and leaves missing cells as null, not 0", () => {
    const rows = [
      ["Metric", "FY26 M5 (INR Cr)"],
      ["Cash", "4.2"],
      ["Burn", ""],
      ["Net revenue", "12.4"],
    ];
    const out = extractFromRows(rows, "MIS");
    const cash = out.find((p) => p.metricKey === "cash");
    const rev = out.find((p) => p.metricKey === "net_revenue");
    const burn = out.find((p) => p.metricKey === "burn");
    expect(cash?.valueNumeric).toBe(4.2);
    expect(rev?.valueNumeric).toBe(12.4);
    expect(burn).toBeUndefined();
    expect(cash?.unit).toBe("crore");
    expect(cash?.currency).toBe("INR");
    expect(cash?.periodStart).toBeTruthy();
  });

  it("sends mixed unit headers to unit_ambiguity instead of guessing", () => {
    const out = extractFromRows([["Revenue (INR Cr / lakh mixed)", "12"]], "MIS");
    expect(out.some((p) => p.kind === "unit_ambiguity")).toBe(true);
  });
});
