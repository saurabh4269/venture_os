export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function monthName(n: number | null | undefined): string {
  if (n == null || n < 1 || n > 12) return "April";
  return MONTH_NAMES[n - 1];
}

export function titleCaseKind(kind: string): string {
  const known: Record<string, string> = {
    mis: "MIS",
    board_pack: "Board pack",
    transcript: "Transcript",
    pending: "Pending",
    parsed: "Parsed",
    failed: "Failed",
    queued: "Queued",
  };
  if (known[kind]) return known[kind];
  return kind.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Positions may store a fraction (0.12) or a percent (18.5). Never invent a figure. */
export function formatOwnership(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}
