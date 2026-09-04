const DEFAULT_FY_START = 4; // April

export function fyStartMonth(override?: number | null): number {
  if (!override || override < 1 || override > 12) return DEFAULT_FY_START;
  return override;
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start: iso(start), end: iso(end) };
}

export function quarterBounds(year: number, quarter: 1 | 2 | 3 | 4, fyStart = DEFAULT_FY_START) {
  const startMonth = fyStart + (quarter - 1) * 3;
  const y = year + Math.floor((startMonth - 1) / 12);
  const m = ((startMonth - 1) % 12) + 1;
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m - 1 + 3, 0));
  return { start: iso(start), end: iso(end) };
}

/** FY starting April 2025 is FY26 in Indian convention (year of the March end). */
export function fyLabel(periodStart: Date, fyStart = DEFAULT_FY_START): string {
  const y = periodStart.getUTCFullYear();
  const m = periodStart.getUTCMonth() + 1;
  const fyEndYear = m >= fyStart ? y + 1 : y;
  return `FY${String(fyEndYear).slice(-2)}`;
}

export function periodContaining(date: Date, grain: "month" | "quarter" | "fy", fyStart = DEFAULT_FY_START) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  if (grain === "month") return { ...monthBounds(y, m), grain };
  if (grain === "quarter") {
    const offset = (m - fyStart + 12) % 12;
    const q = (Math.floor(offset / 3) + 1) as 1 | 2 | 3 | 4;
    const fyBeginYear = m >= fyStart ? y : y - 1;
    return { ...quarterBounds(fyBeginYear, q, fyStart), grain };
  }
  const fyBeginYear = m >= fyStart ? y : y - 1;
  const start = new Date(Date.UTC(fyBeginYear, fyStart - 1, 1));
  const end = new Date(Date.UTC(fyBeginYear + 1, fyStart - 1, 0));
  return { start: iso(start), end: iso(end), grain };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parsePeriodHint(text: string, fyStart = DEFAULT_FY_START) {
  const fy = text.match(/FY\s*'?(\d{2,4})/i);
  if (fy) {
    let endYear = Number(fy[1]);
    if (endYear < 100) endYear += 2000;
    const start = new Date(Date.UTC(endYear - 1, fyStart - 1, 1));
    const end = new Date(Date.UTC(endYear, fyStart - 1, 0));
    return { start: iso(start), end: iso(end), grain: "fy" as const };
  }
  const ym = text.match(/(20\d{2})[-/](\d{1,2})/);
  if (ym) {
    return { ...monthBounds(Number(ym[1]), Number(ym[2])), grain: "month" as const };
  }
  return null;
}
