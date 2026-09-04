import type { FlagKey } from "@venture-os/schema";
import { isPresent, type Num } from "./nulls.js";
import { planVariancePct, runwayMonths } from "./metrics.js";

export type FlagHit = {
  flagKey: FlagKey;
  severity: "low" | "med" | "high";
  evidence: Record<string, unknown>;
};

export const FLAG_CATALOG: { key: FlagKey; label: string; defaultThreshold: number }[] = [
  { key: "runway_short", label: "Runway short", defaultThreshold: 6 },
  { key: "mis_late", label: "MIS late", defaultThreshold: 45 },
  { key: "burn_up", label: "Burn up", defaultThreshold: 0.2 },
  { key: "gm_compression", label: "GM compression", defaultThreshold: 0.03 },
  { key: "plan_variance", label: "Below plan", defaultThreshold: 0.15 },
  { key: "mark_stale", label: "Mark stale", defaultThreshold: 100 },
  { key: "cash_unreported", label: "Cash unreported", defaultThreshold: 1 },
  { key: "revenue_down", label: "Revenue down", defaultThreshold: 0.15 },
  { key: "headcount_drop", label: "Headcount drop", defaultThreshold: 0.1 },
  { key: "call_concern", label: "Concern on a call", defaultThreshold: 0 },
  { key: "spend_without_revenue", label: "Spend rising without revenue", defaultThreshold: 0.2 },
  { key: "customer_concentration", label: "Customer concentration shift", defaultThreshold: 0 },
  { key: "ownership_change", label: "Ownership / governance change", defaultThreshold: 0 },
  { key: "key_person", label: "Key person departure", defaultThreshold: 0 },
];

export function detectRunwayShort(cash: Num, burn: Num, threshold = 6): FlagHit | null {
  const r = runwayMonths(cash, burn);
  if (!isPresent(r)) return null;
  if (r >= threshold) return null;
  return {
    flagKey: "runway_short",
    severity: r < 3 ? "high" : "med",
    evidence: { cash, burn, runwayMonths: r, threshold },
  };
}

export function detectBurnUp(current: Num, prior: Num, threshold = 0.2): FlagHit | null {
  if (!isPresent(current) || !isPresent(prior) || prior === 0) return null;
  const change = (current - prior) / prior;
  if (change <= threshold) return null;
  return {
    flagKey: "burn_up",
    severity: change > 0.4 ? "high" : "med",
    evidence: { current, prior, change, threshold },
  };
}

export function detectGmCompression(current: Num, prior: Num, threshold = 0.03): FlagHit | null {
  if (!isPresent(current) || !isPresent(prior)) return null;
  const drop = prior - current;
  if (drop < threshold) return null;
  return {
    flagKey: "gm_compression",
    severity: drop > 0.08 ? "high" : "med",
    evidence: { current, prior, drop, threshold },
  };
}

/** Below-plan only. Beating the plan is not a risk flag. */
export function detectPlanVariance(actual: Num, plan: Num, threshold = 0.15): FlagHit | null {
  const v = planVariancePct(actual, plan);
  if (!isPresent(v) || v > -threshold) return null;
  return {
    flagKey: "plan_variance",
    severity: v < -0.3 ? "high" : "med",
    evidence: { actual, plan, variance: v, threshold, direction: "below_plan" },
  };
}

export function detectMisLate(
  lastPeriodEnd: string | null,
  asOf: Date,
  graceDays = 45,
  opts?: { companyCreatedAt?: Date | string | null },
): FlagHit | null {
  if (!lastPeriodEnd) {
    const created = opts?.companyCreatedAt ? new Date(opts.companyCreatedAt) : null;
    if (created && !Number.isNaN(created.getTime())) {
      const ageDays = (asOf.getTime() - created.getTime()) / 86400000;
      if (ageDays <= graceDays) return null;
    }
    return {
      flagKey: "mis_late",
      severity: "med",
      evidence: { lastPeriodEnd: null, graceDays, reason: "no_confirmed_mis" },
    };
  }
  const last = new Date(lastPeriodEnd + "T00:00:00Z");
  const days = (asOf.getTime() - last.getTime()) / 86400000;
  if (days <= graceDays) return null;
  return {
    flagKey: "mis_late",
    severity: days > 90 ? "high" : "med",
    evidence: { lastPeriodEnd, daysLate: Math.round(days), graceDays },
  };
}

export function detectMarkStale(
  lastMarkAsOf: string | null,
  asOf: Date,
  staleDays = 100,
): FlagHit | null {
  if (!lastMarkAsOf) {
    return {
      flagKey: "mark_stale",
      severity: "med",
      evidence: { lastMarkAsOf: null, reason: "no_mark" },
    };
  }
  const last = new Date(lastMarkAsOf + "T00:00:00Z");
  const days = (asOf.getTime() - last.getTime()) / 86400000;
  if (days <= staleDays) return null;
  return {
    flagKey: "mark_stale",
    severity: "low",
    evidence: { lastMarkAsOf, days, staleDays },
  };
}

export function detectCashUnreported(priorCash: Num, currentCash: Num): FlagHit | null {
  if (!isPresent(priorCash)) return null;
  if (isPresent(currentCash)) return null;
  return {
    flagKey: "cash_unreported",
    severity: "med",
    evidence: { priorCash, currentCash: null, note: "missing_not_zero" },
  };
}

export function detectRevenueDown(current: Num, prior: Num, threshold = 0.15): FlagHit | null {
  if (!isPresent(current) || !isPresent(prior) || prior === 0) return null;
  const drop = (prior - current) / prior;
  if (drop < threshold) return null;
  return {
    flagKey: "revenue_down",
    severity: drop > 0.3 ? "high" : "med",
    evidence: { current, prior, drop, threshold },
  };
}

/** Brief: spend rising without matching revenue growth. Missing revenue is not treated as 0 growth. */
export function detectSpendWithoutRevenue(
  burn: Num,
  priorBurn: Num,
  revenue: Num,
  priorRevenue: Num,
  threshold = 0.2,
): FlagHit | null {
  if (!isPresent(burn) || !isPresent(priorBurn) || priorBurn === 0) return null;
  if (!isPresent(revenue) || !isPresent(priorRevenue) || priorRevenue === 0) return null;
  const burnChange = (burn - priorBurn) / priorBurn;
  const revChange = (revenue - priorRevenue) / priorRevenue;
  if (burnChange <= threshold || revChange > 0) return null;
  return {
    flagKey: "spend_without_revenue",
    severity: burnChange > 0.4 ? "high" : "med",
    evidence: { burn, priorBurn, burnChange, revenue, priorRevenue, revChange, threshold },
  };
}

export function detectHeadcountDrop(current: Num, prior: Num, threshold = 0.1): FlagHit | null {
  if (!isPresent(current) || !isPresent(prior) || prior === 0) return null;
  const drop = (prior - current) / prior;
  if (drop < threshold) return null;
  return {
    flagKey: "headcount_drop",
    severity: drop > 0.25 ? "high" : "med",
    evidence: { current, prior, drop, threshold },
  };
}

export function detectAll(input: {
  cash: Num;
  burn: Num;
  runwayBurn?: Num;
  priorBurn: Num;
  gm: Num;
  priorGm: Num;
  revenue: Num;
  priorRevenue: Num;
  planRevenue: Num;
  headcount: Num;
  priorHeadcount: Num;
  lastMisPeriodEnd: string | null;
  lastMarkAsOf: string | null;
  priorCash: Num;
  asOf?: Date;
  companyCreatedAt?: Date | string | null;
}): FlagHit[] {
  const asOf = input.asOf ?? new Date();
  return [
    detectRunwayShort(input.cash, input.runwayBurn ?? input.burn),
    detectBurnUp(input.burn, input.priorBurn),
    detectGmCompression(input.gm, input.priorGm),
    detectPlanVariance(input.revenue, input.planRevenue),
    detectRevenueDown(input.revenue, input.priorRevenue),
    detectSpendWithoutRevenue(input.burn, input.priorBurn, input.revenue, input.priorRevenue),
    detectHeadcountDrop(input.headcount, input.priorHeadcount),
    detectMisLate(input.lastMisPeriodEnd, asOf, 45, { companyCreatedAt: input.companyCreatedAt }),
    detectMarkStale(input.lastMarkAsOf, asOf),
    detectCashUnreported(input.priorCash, input.cash),
  ].filter((x): x is FlagHit => x !== null);
}
