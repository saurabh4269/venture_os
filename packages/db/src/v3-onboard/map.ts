import type { Currency, MetricKey, Unit } from "@venture-os/schema";
import { monthBounds, parsePeriodHint } from "@venture-os/core";

/** Heisenbug demo corpus vendored from v3.heisenbug.in chunk 651. */
export type V3Corpus = {
  vendoredAt?: string;
  sourceUrl?: string;
  attribution?: string;
  generatedAt?: string;
  asOf?: string;
  fx: Record<string, number>;
  funds: HeisenbugFund[];
  companies: HeisenbugCompany[];
  documents: HeisenbugDocument[];
  inbox: HeisenbugInbox[];
  notes?: string[];
  publicProfiles?: PublicProfile[];
};

export type PublicProfile = {
  id: string;
  name: string;
  website?: string;
  sector?: string;
  country?: string;
};

export type HeisenbugFund = {
  id: string;
  name: string;
  vintage?: number;
  currency: string;
  deployed?: { amount: number; currency: string };
  geography?: string;
};

export type HeisenbugCompany = {
  id: string;
  name: string;
  legalName?: string;
  sector?: string;
  subSector?: string;
  geo?: string;
  city?: string;
  fundId: string;
  stage?: string;
  status?: string;
  website?: string;
  currency?: string;
  ownershipFd?: number;
  cost?: { amount: number; currency: string };
  fairValue?: { amount: number; currency: string };
  founded?: number;
  monthly?: HeisenbugMonthly[];
  marks?: HeisenbugMark[];
};

export type HeisenbugMonthly = {
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

export type HeisenbugDocument = {
  id: string;
  companyId: string;
  type?: string;
  title?: string;
  date?: string;
  fileName?: string;
  excerpts?: { page: number; heading?: string; text: string }[];
};

export type HeisenbugInbox = {
  id: string;
  companyId: string;
  fileName: string;
  type?: string;
  status: string;
  fields: HeisenbugInboxField[];
};

export type HeisenbugInboxField = {
  key: string;
  label?: string;
  value: string;
  unit?: string;
  period?: string;
  page?: number;
  excerpt?: string;
  confidence?: number;
};

export type HeisenbugMark = {
  asOf: string;
  method: string;
  fairValue?: { amount: number; currency: string };
  rationale?: string;
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
  runwayMonths: null,
  occupancy: null,
  promoDepth: null,
  keyPerson: null,
};

const PERCENT_KEYS = new Set<MetricKey>([
  "gross_margin_pct",
  "contribution_margin_pct",
  "repeat_rate_pct",
]);

const COUNT_KEYS = new Set<MetricKey>(["headcount"]);
const MONEY_KEYS = new Set<MetricKey>([
  "net_revenue",
  "cash",
  "burn",
  "plan_revenue",
  "cac",
]);

export function parseCorpusPeriod(
  period: string,
  fyStartMonth = 4,
): { start: string; end: string; grain: "month" } | null {
  const ym = period.match(/^(20\d{2})-(\d{2})$/);
  if (ym) {
    const bounds = monthBounds(Number(ym[1]), Number(ym[2]));
    return { ...bounds, grain: "month" };
  }
  const hint = parsePeriodHint(period, fyStartMonth);
  if (!hint) return null;
  return { start: hint.start, end: hint.end, grain: "month" };
}

/** Absolute native currency amounts → book units (INR crore / GBP|EUR million). */
export function normalizeMoneyValue(
  value: number,
  currency: string,
  metricKey: MetricKey,
): { valueNumeric: number; unit: Unit; currency: Currency } {
  const cur = currency as Currency;
  if (PERCENT_KEYS.has(metricKey)) {
    return { valueNumeric: value, unit: "percent", currency: "unknown" };
  }
  if (COUNT_KEYS.has(metricKey)) {
    return { valueNumeric: value, unit: "count", currency: "unknown" };
  }
  if (metricKey === "cac") {
    return { valueNumeric: value, unit: "unit", currency: cur };
  }
  if (cur === "INR") {
    return { valueNumeric: value / 10_000_000, unit: "crore", currency: "INR" };
  }
  return { valueNumeric: value / 1_000_000, unit: "million", currency: cur };
}

export function fxTripleFromCorpus(
  fx: Record<string, number>,
  asOf: string,
  currency: string,
): { fxRate: number; fxDate: string; fxSource: string } {
  const eurInr = fx.EUR ?? 91;
  const curInr = fx[currency] ?? (currency === "INR" ? 1 : eurInr);
  const fxRate = currency === "EUR" ? 1 : curInr / eurInr;
  return {
    fxRate,
    fxDate: asOf.length === 7 ? `${asOf}-01` : asOf,
    fxSource: "HEISENBUG_CORPUS_FX",
  };
}

export function mapInboxFieldKey(key: string): MetricKey | null {
  return CORPUS_FIELD_MAP[key] ?? null;
}

type MappedMetric = {
  metricKey: MetricKey;
  valueNumeric: number;
  unit: Unit;
  currency: Currency;
};

/** Corpus monthly row → book metric rows. Skips unsupported keys; derives plan_revenue when possible. */
export function mapCorpusMonthly(
  row: HeisenbugMonthly,
  currency: string,
  fyStartMonth = 4,
): Array<MappedMetric & { periodStart: string; periodEnd: string; grain: "month" }> {
  const bounds = parseCorpusPeriod(row.period, fyStartMonth);
  if (!bounds) return [];
  const out: Array<MappedMetric & { periodStart: string; periodEnd: string; grain: "month" }> = [];

  for (const [field, metricKey] of Object.entries(CORPUS_FIELD_MAP)) {
    if (!metricKey) continue;
    const raw = row[field as keyof HeisenbugMonthly];
    if (raw === undefined || raw === null) continue;
    const normalized = normalizeMoneyValue(Number(raw), currency, metricKey);
    out.push({
      metricKey,
      ...normalized,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      grain: "month",
    });
  }

  if (
    row.revenueVsPlanPct !== undefined &&
    row.netRevenue !== undefined &&
    row.revenueVsPlanPct !== 0
  ) {
    const planNative = Number(row.netRevenue) / (1 + row.revenueVsPlanPct / 100);
    const plan = normalizeMoneyValue(planNative, currency, "plan_revenue");
    out.push({
      metricKey: "plan_revenue",
      ...plan,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      grain: "month",
    });
  }

  return out;
}

export function geoToCountry(geo?: string): string | undefined {
  if (!geo) return undefined;
  if (geo.includes("India")) return "IN";
  if (geo.includes("UK")) return "GB";
  if (geo.includes("EU") || geo.includes("Germany") || geo.includes("France")) return "EU";
  if (geo.includes("US")) return "US";
  return geo.slice(0, 2).toUpperCase();
}

export const V3_ONBOARD_ORG_ID = "org_v3_onboard_seed";
export const V3_ONBOARD_ORG_SLUG = "v3-ventures-onboard-seed";
export const V3_ONBOARD_ORG_NAME = "V3 Ventures (ONBOARD_SEED)";

export function isOnboardSeedMetadata(metadata: string | null | undefined): boolean {
  return Boolean(metadata?.includes("onboardSeed"));
}
