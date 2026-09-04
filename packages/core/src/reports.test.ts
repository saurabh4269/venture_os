import { describe, expect, it } from "vitest";
import { buildMonthlyPackRow, buildOnePagerMetrics, MONTHLY_PACK_METRIC_KEYS, ONE_PAGER_METRIC_KEYS, objectiveBook } from "./reports.js";

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

describe("monthly pack", () => {
  it("keeps objective and subjective in separate lanes and does not invent metrics", () => {
    const row = buildMonthlyPackRow({
      companyId: "c1",
      name: "Alpha",
      stage: "Seed",
      periodEnd: "2026-03-31",
      metrics: [
        {
          metricKey: "cash",
          valueNumeric: 4.2,
          unit: "crore",
          currency: "INR",
          periodEnd: "2026-03-31",
          sourceRefId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        },
      ],
      objective: ["Cash held at 4.2 crore."],
      subjective: ["Founder said hiring is paused."],
    });
    expect(row.metrics.map((m) => m.key)).toEqual([...MONTHLY_PACK_METRIC_KEYS]);
    expect(row.metrics.find((m) => m.key === "cash")?.value).toBe(4.2);
    expect(row.metrics.find((m) => m.key === "net_revenue")?.value).toBeNull();
    expect(row.objective).toEqual(["Cash held at 4.2 crore."]);
    expect(row.subjective).toEqual(["Founder said hiring is paused."]);
    expect(row.objective.join(" ")).not.toContain("hiring is paused");
  });
});