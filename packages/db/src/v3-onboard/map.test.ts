import { describe, expect, it } from "vitest";
import { mapCorpusMonthly } from "./map.js";

describe("mapCorpusMonthly", () => {
  it("maps supported corpus keys and skips unsupported ones", () => {
    const rows = mapCorpusMonthly(
      {
        period: "FY26 M5",
        sourceDocumentId: "doc_x",
        netRevenue: 4.2,
        grossMarginPct: 48,
        netBurn: 0.55,
        marketingSpend: 1.1,
        paybackMonths: 14,
        onlineMixPct: 62,
      },
      "crore",
      "INR",
    );
    const keys = rows.map((r) => r.metricKey);
    expect(keys).toContain("net_revenue");
    expect(keys).toContain("gross_margin_pct");
    expect(keys).toContain("burn");
    expect(keys).not.toContain("marketingSpend");
    expect(keys).not.toContain("paybackMonths");
    expect(rows.find((r) => r.metricKey === "gross_margin_pct")).toMatchObject({
      unit: "percent",
      currency: "unknown",
    });
    expect(rows[0]?.periodStart).toBe("2025-08-01");
    expect(rows[0]?.periodEnd).toBe("2025-08-31");
  });

  it("derives plan_revenue from revenueVsPlanPct when both inputs exist", () => {
    const rows = mapCorpusMonthly(
      {
        period: "FY26 M4",
        sourceDocumentId: "doc_x",
        netRevenue: 9,
        revenueVsPlanPct: 90,
      },
      "crore",
      "INR",
    );
    const plan = rows.find((r) => r.metricKey === "plan_revenue");
    expect(plan?.valueNumeric).toBe(10);
  });

  it("omits absent fields (missing is not zero)", () => {
    const rows = mapCorpusMonthly(
      { period: "FY26 M5", sourceDocumentId: "doc_x", cash: 2.1 },
      "crore",
      "INR",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.metricKey).toBe("cash");
  });
});
