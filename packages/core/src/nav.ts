import { xirr } from "./metrics.js";
import { isPresent, sumPresent, type Num } from "./nulls.js";

export type PositionMark = {
  positionId: string;
  companyId: string;
  companyName: string;
  cost: Num;
  mark: Num;
  markAsOf: string | null;
  sourceRefId?: string | null;
};

export type NavRollup = {
  asOf: string;
  cost: { total: Num; complete: boolean; missing: number };
  nav: { total: Num; complete: boolean; missing: number };
  moic: Num;
  unmarked: { positionId: string; companyName: string }[];
  unprovenanced: { positionId: string; companyName: string }[];
};

function isProvenanced(r: PositionMark): boolean {
  return isPresent(r.mark) && Boolean(r.sourceRefId);
}

/** Default prior period: three calendar months before as-of. */
export function defaultPriorAsOf(asOf: string): string {
  const d = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return asOf;
  d.setUTCMonth(d.getUTCMonth() - 3);
  return d.toISOString().slice(0, 10);
}

export function rollupNav(asOf: string, rows: PositionMark[]): NavRollup {
  const unmarked = rows.filter((r) => !isPresent(r.mark)).map((r) => ({
    positionId: r.positionId,
    companyName: r.companyName,
  }));
  const unprovenanced = rows
    .filter((r) => isPresent(r.mark) && !r.sourceRefId)
    .map((r) => ({ positionId: r.positionId, companyName: r.companyName }));
  const cost = sumPresent(rows.map((r) => r.cost));
  /** Headline NAV excludes unprovenanced marks. Incomplete until every position has a sourced mark. */
  const nav = sumPresent(rows.map((r) => (isProvenanced(r) ? r.mark : null)));
  const headlineMoic =
    rows.length > 0 &&
    rows.every(isProvenanced) &&
    cost.complete &&
    isPresent(nav.total) &&
    isPresent(cost.total) &&
    cost.total !== 0
      ? nav.total / cost.total
      : null;
  return { asOf, cost, nav, moic: headlineMoic, unmarked, unprovenanced };
}

export type BridgeLine = {
  companyName: string;
  priorMark: Num;
  currentMark: Num;
  delta: Num;
  priorAsOf: string | null;
  currentAsOf: string | null;
};

export type NavBridge = {
  priorAsOf: string | null;
  currentAsOf: string;
  deltaNav: Num;
  lines: BridgeLine[];
  unexplained: { companyName: string; reason: "no_prior_mark" | "no_current_mark" }[];
};

/**
 * Period-over-period mark movement. Delta is null when either side is missing
 * (missing ≠ 0). Unexplained names are listed, never filled with a guessed prior.
 */
export function navBridge(currentAsOf: string, current: PositionMark[], prior: PositionMark[]): NavBridge {
  const priorByPosition = new Map(prior.map((r) => [r.positionId, r]));
  const lines: BridgeLine[] = [];
  const unexplained: NavBridge["unexplained"] = [];
  const deltas: Num[] = [];
  let priorAsOf: string | null = null;

  for (const row of current) {
    const prev = priorByPosition.get(row.positionId) ?? prior.find((p) => p.companyId === row.companyId);
    if (prev?.markAsOf && (!priorAsOf || prev.markAsOf > priorAsOf)) priorAsOf = prev.markAsOf;
    const priorMark = prev?.mark ?? null;
    const currentMark = row.mark;
    if (!isPresent(priorMark) && isPresent(currentMark)) {
      unexplained.push({ companyName: row.companyName, reason: "no_prior_mark" });
    }
    if (isPresent(priorMark) && !isPresent(currentMark)) {
      unexplained.push({ companyName: row.companyName, reason: "no_current_mark" });
    }
    const delta = isPresent(priorMark) && isPresent(currentMark) ? currentMark - priorMark : null;
    deltas.push(delta);
    lines.push({
      companyName: row.companyName,
      priorMark,
      currentMark,
      delta,
      priorAsOf: prev?.markAsOf ?? null,
      currentAsOf: row.markAsOf,
    });
  }

  const summed = sumPresent(deltas.filter((d) => isPresent(d)));
  const headline =
    unexplained.length === 0 && current.length > 0 && current.every((r) => isPresent(r.mark))
      ? summed.total
      : null;

  return {
    priorAsOf,
    currentAsOf,
    deltaNav: headline,
    lines,
    unexplained,
  };
}

/**
 * Per-position IRR only when an investment date and a dated mark exist.
 * Never invents investedAt. Cost is an outflow; mark is the residual inflow.
 */
export function datedPositionIrr(args: {
  investedAt?: string | null;
  cost: Num;
  mark: Num;
  markAsOf?: string | null;
}): Num {
  if (!args.investedAt || !args.markAsOf) return null;
  if (!isPresent(args.cost) || !isPresent(args.mark)) return null;
  const start = new Date(`${args.investedAt}T00:00:00Z`);
  const end = new Date(`${args.markAsOf}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end.getTime() <= start.getTime()) return null;
  return xirr([
    { date: start, amount: -Math.abs(args.cost) },
    { date: end, amount: args.mark },
  ]);
}
