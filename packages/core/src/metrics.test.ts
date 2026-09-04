import { describe, expect, it } from "vitest";
import {
  dpi,
  latestByMetricPeriod,
  latestByPeriod,
  moic,
  runwayMonths,
  runwayMonthsFromBurns,
  seriesFor,
  tvpi,
  xirr,
} from "./metrics.js";
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

  it("uses average of present burns only — never zero-fills missing months", () => {
    expect(runwayMonthsFromBurns(12, [2, 4, null])).toBe(4);
    expect(runwayMonthsFromBurns(12, [null, null])).toBeNull();
  });

  it("latestByPeriod ignores a restated older version of the same period", () => {
    const series = latestByPeriod([
      { metricKey: "burn", periodEnd: "2026-08-31", version: 2, valueNumeric: 1.1 },
      { metricKey: "burn", periodEnd: "2026-08-31", version: 1, valueNumeric: 9.9 },
      { metricKey: "burn", periodEnd: "2026-07-31", version: 1, valueNumeric: 0.8 },
    ]);
    expect(series[0]?.valueNumeric).toBe(1.1);
    expect(series[1]?.valueNumeric).toBe(0.8);
  });

  it("latestByMetricPeriod keeps cash and burn in the same period", () => {
    const rows = latestByMetricPeriod([
      { metricKey: "cash", periodEnd: "2026-08-31", version: 1, valueNumeric: 10 },
      { metricKey: "burn", periodEnd: "2026-08-31", version: 1, valueNumeric: 2 },
      { metricKey: "cash", periodEnd: "2026-08-31", version: 2, valueNumeric: 12 },
    ]);
    expect(rows.find((r) => r.metricKey === "cash")?.valueNumeric).toBe(12);
    expect(rows.find((r) => r.metricKey === "burn")?.valueNumeric).toBe(2);
  });

  it("seriesFor is restatement-safe before a 3-mo burn slice", () => {
    const burns = seriesFor(
      [
        { metricKey: "burn", periodEnd: "2026-08-31", version: 1, valueNumeric: 9 },
        { metricKey: "burn", periodEnd: "2026-08-31", version: 2, valueNumeric: 2 },
        { metricKey: "burn", periodEnd: "2026-07-31", version: 1, valueNumeric: 2 },
        { metricKey: "cash", periodEnd: "2026-08-31", version: 1, valueNumeric: 12 },
      ],
      "burn",
    );
    expect(burns.map((b) => b.valueNumeric)).toEqual([2, 2]);
    expect(runwayMonthsFromBurns(12, burns.slice(0, 3).map((b) => b.valueNumeric ?? null))).toBe(6);
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
