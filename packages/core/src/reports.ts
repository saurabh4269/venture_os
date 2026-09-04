import { metricByKey } from "./catalog.js";
import { runwayMonthsFromBurns, seriesFor } from "./metrics.js";

/** Partner one-pager field order. Missing stays —. Do not invent extras. */
export const ONE_PAGER_METRIC_KEYS = [
  "net_revenue",
  "gross_margin_pct",
  "cash",
  "burn",
  "runway_months",
] as const;

export type BookMetric = {
  metricKey: string;
  valueNumeric: number | null;
  unit: string;
  currency: string;
  periodEnd: string;
  sourceRefId: string;
  valueEur?: number | null;
  fxRate?: number | null;
  fxDate?: string | null;
  fxSource?: string | null;
  lane?: string | null;
};

export type ReportMetric = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  currency: string;
  periodEnd: string;
  sourceRefId: string;
  valueEur: number | null;
  fxRate: number | null;
  fxDate: string | null;
  fxSource: string | null;
};

function emptyRow(key: string): ReportMetric {
  const def = metricByKey(key);
  return {
    key,
    label: def?.label ?? key.replaceAll("_", " "),
    value: null,
    unit: def?.defaultUnit ?? "unknown",
    currency: "INR",
    periodEnd: "",
    sourceRefId: "",
    valueEur: null,
    fxRate: null,
    fxDate: null,
    fxSource: null,
  };
}

function fromBook(key: string, m: BookMetric): ReportMetric {
  return {
    key,
    label: metricByKey(key)?.label ?? key.replaceAll("_", " "),
    value: m.valueNumeric,
    unit: m.unit,
    currency: m.currency,
    periodEnd: m.periodEnd,
    sourceRefId: m.sourceRefId,
    valueEur: m.valueEur ?? null,
    fxRate: m.fxRate ?? null,
    fxDate: m.fxDate ?? null,
    fxSource: m.fxSource ?? null,
  };
}

/** Objective-lane facts only. Subjective never enters a numbers page. */
export function objectiveBook<T extends { lane?: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => !r.lane || r.lane === "objective");
}

export function buildOnePagerMetrics(rows: BookMetric[]): ReportMetric[] {
  const book = objectiveBook(rows);
  return ONE_PAGER_METRIC_KEYS.map((key) => {
    if (key === "runway_months") {
      const booked = seriesFor(book, "runway_months")[0];
      if (booked && booked.valueNumeric != null) return fromBook(key, booked);
      const cash = seriesFor(book, "cash")[0];
      const burns = seriesFor(book, "burn");
      const derived = runwayMonthsFromBurns(
        cash?.valueNumeric ?? null,
        burns.slice(0, 3).map((b) => b.valueNumeric ?? null),
      );
      if (derived == null) return emptyRow(key);
      return {
        ...emptyRow(key),
        value: derived,
        unit: "months",
        periodEnd: cash?.periodEnd ?? "",
        sourceRefId: cash?.sourceRefId && burns[0]?.sourceRefId ? cash.sourceRefId : "",
      };
    }
    const m = seriesFor(book, key)[0];
    return m ? fromBook(key, m) : emptyRow(key);
  });
}

export function toReportMetric(m: BookMetric): ReportMetric {
  return fromBook(m.metricKey, m);
}

/** Monthly pack metric order. Objective numbers only. */
export const MONTHLY_PACK_METRIC_KEYS = [
  "net_revenue",
  "gross_margin_pct",
  "cash",
  "burn",
  "runway_months",
] as const;

export type MonthlyPackRow = {
  companyId: string;
  name: string;
  stage: string | null;
  periodEnd: string;
  metrics: ReportMetric[];
  objective: string[];
  subjective: string[];
};

/**
 * One row per company for the monthly sheet.
 * Objective and subjective stay in separate arrays — never blended.
 * Missing metrics stay null / —.
 */
export function buildMonthlyPackRow(args: {
  companyId: string;
  name: string;
  stage?: string | null;
  periodEnd?: string;
  metrics: BookMetric[];
  objective: string[];
  subjective: string[];
}): MonthlyPackRow {
  const curated = buildOnePagerMetrics(args.metrics);
  const periodEnd =
    args.periodEnd ||
    curated.find((m) => m.periodEnd)?.periodEnd ||
    "";
  return {
    companyId: args.companyId,
    name: args.name,
    stage: args.stage ?? null,
    periodEnd,
    metrics: curated,
    objective: args.objective,
    subjective: args.subjective,
  };
}