import { div, isPresent, type Num } from "./nulls.js";

/** Runway (months) = cash / burn. Missing either, or burn ≤ 0 → null. Never treat missing as 0. */
export function runwayMonths(cash: Num, burn: Num): Num {
  if (!isPresent(cash) || !isPresent(burn)) return null;
  if (burn <= 0) return null;
  return cash / burn;
}

/** MOIC = total value / cost. */
export function moic(totalValue: Num, cost: Num): Num {
  return div(totalValue, cost);
}

/** TVPI = (residual + distributions) / paid-in. */
export function tvpi(residual: Num, distributions: Num, paidIn: Num): Num {
  if (!isPresent(residual) || !isPresent(distributions) || !isPresent(paidIn) || paidIn === 0) {
    return null;
  }
  return (residual + distributions) / paidIn;
}

/** DPI = distributions / paid-in. */
export function dpi(distributions: Num, paidIn: Num): Num {
  return div(distributions, paidIn);
}

export type Cashflow = { date: Date; amount: number };

/**
 * XIRR via Newton–Raphson. Returns null if fewer than two finite flows,
 * or if the solver does not converge. Amounts must not be imputed.
 */
export function xirr(flows: Cashflow[], guess = 0.1): Num {
  const clean = flows.filter((f) => Number.isFinite(f.amount));
  if (clean.length < 2) return null;
  const hasPos = clean.some((f) => f.amount > 0);
  const hasNeg = clean.some((f) => f.amount < 0);
  if (!hasPos || !hasNeg) return null;

  const t0 = clean[0]!.date.getTime();
  const years = (d: Date) => (d.getTime() - t0) / (365.25 * 24 * 3600 * 1000);

  const npv = (r: number) => clean.reduce((s, f) => s + f.amount / (1 + r) ** years(f.date), 0);
  const dnpv = (r: number) =>
    clean.reduce((s, f) => {
      const t = years(f.date);
      return s - (t * f.amount) / (1 + r) ** (t + 1);
    }, 0);

  let r = guess;
  for (let i = 0; i < 64; i++) {
    const y = npv(r);
    const dy = dnpv(r);
    if (Math.abs(dy) < 1e-12) return null;
    const next = r - y / dy;
    if (!Number.isFinite(next)) return null;
    if (Math.abs(next - r) < 1e-7) return next;
    r = next;
  }
  return null;
}

export function planVariancePct(actual: Num, plan: Num): Num {
  if (!isPresent(actual) || !isPresent(plan) || plan === 0) return null;
  return (actual - plan) / plan;
}

export function delta(current: Num, prior: Num): Num {
  if (!isPresent(current) || !isPresent(prior)) return null;
  return current - prior;
}
