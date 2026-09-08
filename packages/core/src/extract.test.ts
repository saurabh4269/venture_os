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

  it("appends header context into excerpts", () => {
    const out = extractFromRows(
      [
        ["Metric", "FY26 M5 INR Cr"],
        ["Cash", "4.2"],
      ],
      "MIS",
    );
    expect(out[0]?.excerpt).toContain("·");
    expect(out[0]?.excerpt).toMatch(/FY26/);
  });

  it("fuzzy-suggests near-miss labels at capped confidence (propose only)", () => {
    const out = extractFromRows(
      [
        ["Metric", "INR Cr"],
        ["Kash balance", "9.1"],
      ],
      "MIS",
    );
    const cash = out.find((p) => p.metricKey === "cash");
    expect(cash).toBeTruthy();
    expect(cash!.confidence).toBeLessThanOrEqual(0.55);
  });

  it("proposes null for an explicit missing marker, not a skipped blank", () => {
    const out = extractFromRows(
      [
        ["Metric", "FY26 M6 (INR Cr)"],
        ["Closing cash", "—"],
        ["Monthly burn", "0.4"],
      ],
      "MIS",
    );
    const cash = out.find((p) => p.metricKey === "cash");
    const burn = out.find((p) => p.metricKey === "burn");
    expect(cash?.valueNumeric).toBeNull();
    expect(burn?.valueNumeric).toBe(0.4);
  });

  it("assigns distinct periods per month column", () => {
    const out = extractFromRows(
      [
        ["Metric", "FY26 M4 (INR Cr)", "FY26 M5 (INR Cr)", "FY26 M6 (INR Cr)"],
        ["Closing cash", 6.4, 5.9, 5.4],
        ["Monthly burn", 0.55, 0.5, 0.48],
      ],
      "MIS",
    );
    const cash = out.filter((p) => p.metricKey === "cash");
    expect(cash).toHaveLength(3);
    const ends = cash.map((p) => p.periodEnd);
    expect(new Set(ends).size).toBe(3);
    expect(ends[0]).not.toBe(ends[1]);
  });
});
