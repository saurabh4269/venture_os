import { describe, expect, it } from "vitest";
import {
  mapCorpusMonthly,
  normalizeMoneyValue,
  parseCorpusPeriod,
} from "./map.js";

describe("parseCorpusPeriod", () => {
  it("parses YYYY-MM calendar months", () => {
    expect(parseCorpusPeriod("2026-07")).toEqual({
      start: "2026-07-01",
      end: "2026-07-31",
      grain: "month",
    });
  });
});

describe("normalizeMoneyValue", () => {
  it("converts INR absolute to crore", () => {
    expect(normalizeMoneyValue(48_000_000, "INR", "net_revenue")).toEqual({
      valueNumeric: 4.8,
      unit: "crore",
      currency: "INR",
    });
  });

  it("converts GBP absolute to million", () => {
    expect(normalizeMoneyValue(1_544_109, "GBP", "net_revenue")).toEqual({
      valueNumeric: 1.544109,
      unit: "million",
      currency: "GBP",
    });
  });
});

describe("mapCorpusMonthly", () => {
  it("maps supported corpus keys and skips unsupported ones", () => {
    const rows = mapCorpusMonthly(
      {
        period: "2026-07",
        sourceDocumentId: "doc_x",
        netRevenue: 48_000_000,
        grossMarginPct: 48,
        netBurn: 5_500_000,
        marketingSpend: 1_100_000,
        paybackMonths: 14,
        onlineMixPct: 62,
      },
      "INR",
    );
    const keys = rows.map((r) => r.metricKey);
    expect(keys).toContain("net_revenue");
    expect(keys).toContain("gross_margin_pct");
    expect(keys).toContain("burn");
    expect(keys).not.toContain("marketingSpend");
    expect(rows.find((r) => r.metricKey === "net_revenue")?.valueNumeric).toBe(4.8);
    expect(rows.find((r) => r.metricKey === "gross_margin_pct")).toMatchObject({
      unit: "percent",
      currency: "unknown",
    });
  });

  it("derives plan_revenue from revenueVsPlanPct when both inputs exist", () => {
    const rows = mapCorpusMonthly(
      {
        period: "2026-04",
        sourceDocumentId: "doc_x",
        netRevenue: 108_000_000,
        revenueVsPlanPct: 8,
      },
      "INR",
    );
    const plan = rows.find((r) => r.metricKey === "plan_revenue");
    expect(plan?.valueNumeric).toBeCloseTo(10, 1);
  });

  it("omits absent fields (missing is not zero)", () => {
    const rows = mapCorpusMonthly(
      { period: "2026-07", sourceDocumentId: "doc_x", cash: 21_000_000 },
      "INR",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.metricKey).toBe("cash");
  });
});
