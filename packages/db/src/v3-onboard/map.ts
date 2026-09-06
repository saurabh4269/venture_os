import type { Currency, MetricKey, Unit } from "@venture-os/schema";
import { parsePeriodHint } from "@venture-os/core";

/** Vendored public/illustrative corpus shape (fixtures/v3-onboard/corpus.json). */
export type V3Corpus = {
  version: number;
  attribution: string;
  fx: { fxRate: number; fxDate: string; fxSource: string };
  funds: Array<{
    id: string;
    name: string;
    vintage: number;
    currency: string;
    committedCapital: number;
  }>;
  companies: V3CorpusCompany[];
  documents: V3CorpusDocument[];
  pendingInbox: V3CorpusInbox[];
};

export type V3CorpusCompany = {
  id: string;
  name: string;
  sector: string;
  stage: string;
  country: string;
  fundId: string;
  ownershipPct: number;
  costBasis: number;
  costCurrency: string;
  investedAt: string;
  unitHint: string;
  currencyHint: string;
  mark?: { asOf: string; value: number; method: string };
  monthly: V3CorpusMonthly[];
  commentary?: V3CorpusCommentary[];
};

export type V3CorpusDocument = {
  id: string;
  companyId: string;
  filename: string;
  periodStart: string;
  periodEnd: string;
  kind?: string;
};

export type V3CorpusMonthly = {
  period: string;
  sourceDocumentId: string;
  sourcePage?: number;
  netRevenue?: number;
  grossMarginPct?: number;
  contributionMarginPct?: number;
  cash?: number;
  netBurn?: number;
  headcount?: number;
  cac?: number;
  paybackMonths?: number;
  repeatRatePct?: number;
  marketingSpend?: number;
  onlineMixPct?: number;
  revenueVsPlanPct?: number;
};

export type V3CorpusCommentary = {
  period: string;
  objective?: string;
  subjective?: string;
  sourceDocumentId?: string;
  sourcePage?: number;
};

export type V3CorpusInbox = {
  companyId: string;
  documentId: string;
  metricKey: MetricKey;
  valueNumeric: number;
  unit: Unit;
  currency: Currency;
  period: string;
  locator: Record<string, unknown>;
  confidence: number;
};

type MappedMetric = {
  metricKey: MetricKey;
  valueNumeric: number;
  unit: Unit;
  currency: Currency;
};

const CORPUS_FIELD_MAP: Record<string, MetricKey | null> = {
  netRevenue: "net_revenue",
  grossMarginPct: "gross_margin_pct",
  contributionMarginPct: "contribution_margin_pct",
  cash: "cash",
  netBurn: "burn",
  headcount: "headcount",
  cac: "cac",
  repeatRatePct: "repeat_rate_pct",
  marketingSpend: null,
  onlineMixPct: null,
  paybackMonths: null,
  revenueVsPlanPct: null,
};

const PERCENT_KEYS = new Set<MetricKey>([
  "gross_margin_pct",
  "contribution_margin_pct",
  "repeat_rate_pct",
]);

const COUNT_KEYS = new Set<MetricKey>(["headcount"]);

/** Corpus monthly row → book metric rows. Skips unsupported keys; derives plan_revenue when possible. */
export function mapCorpusMonthly(
  row: V3CorpusMonthly,
  unitHint: string,
  currencyHint: string,
  fyStartMonth = 4,
): Array<MappedMetric & { periodStart: string; periodEnd: string; grain: "month" }> {
  const bounds = parsePeriodHint(row.period, fyStartMonth);
  if (!bounds) return [];
  const out: Array<MappedMetric & { periodStart: string; periodEnd: string; grain: "month" }> = [];

  for (const [field, metricKey] of Object.entries(CORPUS_FIELD_MAP)) {
    if (!metricKey) continue;
    const raw = row[field as keyof V3CorpusMonthly];
    if (raw === undefined || raw === null) continue;
    const unit = metricUnit(metricKey, unitHint);
    const currency = metricCurrency(metricKey, currencyHint);
    out.push({
      metricKey,
      valueNumeric: Number(raw),
      unit,
      currency,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      grain: "month",
    });
  }

  if (
    row.revenueVsPlanPct !== undefined &&
    row.netRevenue !== undefined &&
    row.revenueVsPlanPct > 0
  ) {
    const plan = row.netRevenue / (row.revenueVsPlanPct / 100);
    out.push({
      metricKey: "plan_revenue",
      valueNumeric: plan,
      unit: unitHint as Unit,
      currency: currencyHint as Currency,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      grain: "month",
    });
  }

  return out;
}

function metricUnit(metricKey: MetricKey, unitHint: string): Unit {
  if (PERCENT_KEYS.has(metricKey)) return "percent";
  if (COUNT_KEYS.has(metricKey)) return "count";
  if (metricKey === "cac") return "unit";
  return unitHint === "million" ? "million" : (unitHint as Unit);
}

function metricCurrency(metricKey: MetricKey, currencyHint: string): Currency {
  if (PERCENT_KEYS.has(metricKey) || COUNT_KEYS.has(metricKey)) return "unknown";
  return currencyHint as Currency;
}

export const V3_ONBOARD_ORG_ID = "org_v3_onboard_seed";
export const V3_ONBOARD_ORG_SLUG = "v3-ventures-onboard-seed";
export const V3_ONBOARD_ORG_NAME = "V3 Ventures (ONBOARD_SEED)";

export function isOnboardSeedMetadata(metadata: string | null | undefined): boolean {
  return Boolean(metadata?.includes("onboardSeed"));
}
