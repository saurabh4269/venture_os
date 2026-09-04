import { isPresent, sumPresent, type Num } from "./nulls.js";

export type PositionMark = {
  positionId: string;
  companyId: string;
  companyName: string;
  cost: Num;
  mark: Num;
  markAsOf: string | null;
};

export type NavRollup = {
  asOf: string;
  cost: { total: Num; complete: boolean; missing: number };
  nav: { total: Num; complete: boolean; missing: number };
  moic: Num;
  unmarked: { positionId: string; companyName: string }[];
};

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
  const cost = sumPresent(rows.map((r) => r.cost));
  const nav = sumPresent(rows.map((r) => r.mark));
  const moic =
    isPresent(nav.total) && isPresent(cost.total) && cost.total !== 0 && cost.complete && nav.complete
      ? nav.total / cost.total
      : isPresent(nav.total) && isPresent(cost.total) && cost.total !== 0 && !unmarked.length
        ? nav.total / cost.total
        : null;
  // MOIC as a headline only if every position that has cost also has a mark
  const headlineMoic =
    rows.every((r) => !isPresent(r.cost) || isPresent(r.mark)) &&
    isPresent(nav.total) &&
    isPresent(cost.total) &&
    cost.total !== 0
      ? nav.total / cost.total
      : null;
  void moic;
  return { asOf, cost, nav, moic: headlineMoic, unmarked };
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
