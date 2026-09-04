import { createHash } from "node:crypto";
import type { Num } from "./nulls.js";
import { rollupEur, type EurRollup, type NavRollup } from "./nav.js";

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

export { rollupEur };

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
