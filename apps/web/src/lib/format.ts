/** Positions may store a fraction (0.12) or a percent (18.5). Never invent a figure. */
export function formatOwnership(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}
