import type { Currency, Unit } from "@venture-os/schema";
import { formatMissing, isPresent, type Num } from "./nulls.js";
import { formatMoney } from "./units.js";

export function factOrDash(args: {
  value: Num;
  sourceRefId?: string | null;
  unit?: Unit;
  currency?: Currency;
}): { display: string; isFact: boolean } {
  if (!args.sourceRefId) return { display: "—", isFact: false };
  if (!isPresent(args.value)) return { display: "—", isFact: false };
  if (args.unit && args.currency) {
    return { display: formatMoney(args.value, args.unit, args.currency), isFact: true };
  }
  return { display: formatMissing(args.value, (v) => v.toLocaleString("en-IN")), isFact: true };
}

export function pct(n: Num): string {
  if (!isPresent(n)) return "—";
  return `${(n * (n > 1.5 ? 1 : 100)).toFixed(1)}%`.replace(/\.0%/, "%");
}

/** Percents stored as 0–1 or 0–100: if abs > 1.5 treat as already-percent. */
export function asRatio(n: Num): Num {
  if (!isPresent(n)) return null;
  return Math.abs(n) > 1.5 ? n / 100 : n;
}
