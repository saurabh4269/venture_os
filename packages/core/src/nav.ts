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
