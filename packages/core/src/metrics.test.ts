import { describe, expect, it } from "vitest";
import { dpi, moic, runwayMonths, tvpi, xirr } from "./metrics.js";
import { add, formatMissing, sumComplete, sumPresent } from "./nulls.js";

describe("null semantics", () => {
  it("does not treat missing as zero in add", () => {
    expect(add(null, 4)).toBeNull();
    expect(add(2, null)).toBeNull();
    expect(add(2, 4)).toBe(6);
  });

  it("sumComplete is null if any constituent is missing", () => {
    expect(sumComplete([1, null, 3])).toBeNull();
    expect(sumComplete([1, 2, 3])).toBe(6);
  });

  it("sumPresent reports incompleteness instead of filling zeros", () => {
    const r = sumPresent([10, null, 5]);
    expect(r.total).toBe(15);
    expect(r.complete).toBe(false);
    expect(r.missing).toBe(1);
  });

  it("formats missing as em dash, never 0", () => {
    expect(formatMissing(null)).toBe("—");
    expect(formatMissing(0)).toBe("0");
  });
});

describe("runway", () => {
  it("is cash / burn when both present and burn > 0", () => {
    expect(runwayMonths(12, 2)).toBe(6);
  });

  it("is null when cash missing — not infinite, not 0", () => {
    expect(runwayMonths(null, 2)).toBeNull();
  });

  it("is null when burn missing — not treating burn as 0", () => {
    expect(runwayMonths(12, null)).toBeNull();
  });

  it("is null when burn is 0 or negative", () => {
    expect(runwayMonths(12, 0)).toBeNull();
    expect(runwayMonths(12, -1)).toBeNull();
  });
});

describe("MOIC / TVPI / DPI", () => {
  it("computes MOIC from value / cost", () => {
    expect(moic(20, 8)).toBeCloseTo(2.5);
  });

  it("MOIC is null if either side is missing", () => {
    expect(moic(null, 8)).toBeNull();
    expect(moic(20, null)).toBeNull();
    expect(moic(20, 0)).toBeNull();
  });

  it("TVPI needs residual, distributions, and paid-in", () => {
    expect(tvpi(10, 2, 6)).toBeCloseTo(2);
    expect(tvpi(null, 2, 6)).toBeNull();
  });

  it("DPI is distributions / paid-in", () => {
    expect(dpi(3, 6)).toBeCloseTo(0.5);
    expect(dpi(null, 6)).toBeNull();
  });
});

describe("XIRR", () => {
  it("solves a textbook two-flow case", () => {
    const r = xirr([
      { date: new Date("2024-01-01"), amount: -100 },
      { date: new Date("2025-01-01"), amount: 110 },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.1, 2);
  });

  it("returns null without both signs or with a single flow", () => {
    expect(xirr([{ date: new Date("2024-01-01"), amount: -100 }])).toBeNull();
    expect(
      xirr([
        { date: new Date("2024-01-01"), amount: 10 },
        { date: new Date("2025-01-01"), amount: 10 },
      ]),
    ).toBeNull();
  });
});
