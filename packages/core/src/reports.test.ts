import { describe, expect, it } from "vitest";
import { buildOnePagerMetrics, ONE_PAGER_METRIC_KEYS, objectiveBook } from "./reports.js";

describe("one-pager curation", () => {
  it("emits a fixed field order and keeps missing as null", () => {
    const rows = buildOnePagerMetrics([
      {
        metricKey: "cash",
        valueNumeric: 12,
        unit: "crore",
        currency: "INR",
        periodEnd: "2026-03-31",
        sourceRefId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      },
      {
        metricKey: "opex",
        valueNumeric: 3,
        unit: "crore",
        currency: "INR",
        periodEnd: "2026-03-31",
        sourceRefId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      },
    ]);
    expect(rows.map((r) => r.key)).toEqual([...ONE_PAGER_METRIC_KEYS]);
    expect(rows.find((r) => r.key === "cash")?.value).toBe(12);
    expect(rows.find((r) => r.key === "net_revenue")?.value).toBeNull();
    expect(rows.some((r) => r.key === "opex")).toBe(false);
  });

  it("derives runway from cash + burns when runway_months is absent", () => {
    const rows = buildOnePagerMetrics([
      {
        metricKey: "cash",
        valueNumeric: 9,
        unit: "crore",
        currency: "INR",
        periodEnd: "2026-03-31",
        sourceRefId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      },
      {
        metricKey: "burn",
        valueNumeric: 3,
        unit: "crore",
        currency: "INR",
        periodEnd: "2026-03-31",
        sourceRefId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      },
    ]);
    expect(rows.find((r) => r.key === "runway_months")?.value).toBe(3);
  });

  it("drops subjective rows from the numbers page", () => {
    const kept = objectiveBook([
      { lane: "objective", metricKey: "cash" },
      { lane: "subjective", metricKey: "cash" },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.lane).toBe("objective");
  });
});