import { createHash } from "node:crypto";
import { isPresent, type Num } from "./nulls.js";
import type { NavRollup } from "./nav.js";

/** Official locked-as-of pack. Deterministic JSON — never filled with invented marks. */
export const NAV_PACK_KIND = "nav_period_pack" as const;
export const NAV_PACK_VERSION = 1 as const;

export type NavPackPosition = {
  positionId: string;
  companyName: string;
  cost: Num;
  mark: Num;
  markAsOf: string | null;
  sourceRefId: string | null;
  currency: string | null;
  fxRate: number | null;
  fxDate: string | null;
  fxSource: string | null;
  valueEur: Num;
};

export type EurRollup = {
  total: Num;
  conversionRefused: boolean;
  fxNote: string | null;
};

/**
 * Headline EUR only when every sourced mark has a complete FX triple and a stored EUR.
 * One incomplete triple refuses the whole headline — we do not invent a blended rate.
 */
export function rollupEur(
  rows: Array<{
    mark: Num;
    sourceRefId?: string | null;
    valueEur?: Num;
    fxRate?: number | null;
    fxDate?: string | null;
    fxSource?: string | null;
  }>,
): EurRollup {
  const sourced = rows.filter((r) => isPresent(r.mark) && r.sourceRefId);
  if (sourced.length === 0) {
    return { total: null, conversionRefused: false, fxNote: null };
  }
  const complete = sourced.every(
    (r) => isPresent(r.fxRate ?? null) && r.fxDate && r.fxSource && isPresent(r.valueEur ?? null),
  );
  if (!complete) {
    return { total: null, conversionRefused: true, fxNote: "EUR — (no FX triple)" };
  }
  const total = sourced.reduce((acc, r) => acc + (r.valueEur as number), 0);
  return { total, conversionRefused: false, fxNote: null };
}

export type NavPackSnapshot = {
  version: typeof NAV_PACK_VERSION;
  kind: typeof NAV_PACK_KIND;
  asOf: string;
  lockedAt: string;
  lockedBy: string;
  rollup: NavRollup;
  eur: EurRollup;
  positions: NavPackPosition[];
};

export function buildNavPackSnapshot(args: {
  asOf: string;
  lockedAt: string;
  lockedBy: string;
  rollup: NavRollup;
  positions: NavPackPosition[];
}): NavPackSnapshot {
  return {
    version: NAV_PACK_VERSION,
    kind: NAV_PACK_KIND,
    asOf: args.asOf,
    lockedAt: args.lockedAt,
    lockedBy: args.lockedBy,
    rollup: args.rollup,
    eur: rollupEur(args.positions),
    positions: args.positions,
  };
}

export function hashNavPackSnapshot(pack: NavPackSnapshot): string {
  return createHash("sha256").update(JSON.stringify(pack)).digest("hex");
}
