import { describe, expect, it } from "vitest";
import { formatDualDisplay, formatRunwayMonths } from "./display.js";

describe("formatRunwayMonths", () => {
  it("rounds to one decimal and labels months", () => {
    expect(formatRunwayMonths(4.504615384615385)).toBe("4.5 mo");
    expect(formatRunwayMonths(6)).toBe("6 mo");
    expect(formatRunwayMonths(null)).toBe("");
  });
});

describe("dual currency display", () => {
  it("shows EUR only when the FX triple is complete", () => {
    const d = formatDualDisplay({
      value: 10,
      sourceRefId: "ref-1",
      unit: "crore",
      currency: "INR",
      valueEur: 0.11,
      fxRate: 0.011,
      fxDate: "2026-09-01",
      fxSource: "RBI",
    });
    expect(d.isFact).toBe(true);
    expect(d.conversionRefused).toBe(false);
    expect(d.fxNote).toContain("0.011");
    expect(d.fxNote).toContain("2026-09-01");
    expect(d.fxNote).toContain("RBI");
  });

  it("refuses conversion when rate, date, or source is missing", () => {
    const d = formatDualDisplay({
      value: 10,
      sourceRefId: "ref-1",
      unit: "crore",
      currency: "INR",
      valueEur: 0.11,
      fxRate: 0.011,
      fxDate: "2026-09-01",
    });
    expect(d.conversionRefused).toBe(true);
    expect(d.converted).toBe("—");
    expect(d.fxNote).toBeNull();
    expect(d.display).toContain("10");
  });
});
