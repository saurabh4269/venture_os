import type { Currency, Grain, Locator, MetricKey, Unit } from "@venture-os/schema";
import { matchMetricAlias } from "./catalog.js";
import { parsePeriodHint } from "./fiscal.js";
import { detectCurrency, detectUnit } from "./units.js";

export type ExtractedProposal = {
  kind: "metric" | "unit_ambiguity" | "commentary";
  metricKey?: MetricKey;
  label: string;
  valueNumeric: number | null;
  unit: Unit;
  currency: Currency;
  periodStart?: string;
  periodEnd?: string;
  grain?: Grain;
  confidence: number;
  locator: Locator;
  excerpt: string;
  lane: "objective" | "subjective";
};

function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw).replace(/[, ]/g, "").replace(/[₹$€£]/g, "");
  if (!s || /^[-–—]+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function extractFromRows(
  rows: unknown[][],
  sheet: string,
  fyStartMonth = 4,
): ExtractedProposal[] {
  const out: ExtractedProposal[] = [];
  const header = (rows[0] ?? []).map((c) => String(c ?? "")).join(" ");
  let period = parsePeriodHint(`${sheet} ${header}`, fyStartMonth);
  const headerUnit = detectUnit(`${header} ${sheet}`);
  const headerCurrency = detectCurrency(`${header} ${sheet}`);
  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    const row = rows[r] ?? [];
    const label = String(row[0] ?? "").trim();
    if (!label) continue;
    const periodHint = parsePeriodHint(label, fyStartMonth);
    if (periodHint) period = periodHint;
    const def = matchMetricAlias(label);
    const headerCtx = `${label} ${header} ${sheet}`;
    const unitDetect = detectUnit(headerCtx);
    const resolvedUnit = unitDetect === "unknown" ? headerUnit : unitDetect;
    const currency =
      detectCurrency(headerCtx) === "unknown" ? headerCurrency : detectCurrency(headerCtx);
    for (let c = 1; c < Math.min(row.length, 16); c++) {
      const valueNumeric = parseNumber(row[c]);
      if (valueNumeric === null && row[c] !== 0) continue;
      const cell = `${colName(c)}${r + 1}`;
      const excerpt = `${label} → ${row[c]}`;
      if (resolvedUnit === "ambiguous" || (def?.unitFamily === "money" && resolvedUnit === "unknown")) {
        out.push({
          kind: "unit_ambiguity",
          metricKey: def?.key,
          label,
          valueNumeric,
          unit: "unknown",
          currency,
          periodStart: period?.start,
          periodEnd: period?.end,
          grain: period?.grain,
          confidence: 0.35,
          locator: { sheet, cell, excerpt },
          excerpt,
          lane: "objective",
        });
        continue;
      }
      if (!def) continue;
      const unit: Unit = resolvedUnit === "unknown" ? def.defaultUnit : resolvedUnit;
      out.push({
        kind: "metric",
        metricKey: def.key,
        label,
        valueNumeric,
        unit,
        currency: def.unitFamily === "money" ? currency : "unknown",
        periodStart: period?.start,
        periodEnd: period?.end,
        grain: period?.grain ?? "month",
        confidence: resolvedUnit === "unknown" ? 0.55 : 0.82,
        locator: { sheet, cell, excerpt },
        excerpt,
        lane: "objective",
      });
    }
  }
  return out;
}

export function extractFromPdfText(text: string, fyStartMonth = 4): ExtractedProposal[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: unknown[][] = [];
  for (const line of lines) {
    const period = parsePeriodHint(line, fyStartMonth);
    const m = line.match(/^(.{3,40}?)[:\s]+(-?[\d,.]+)\s*(crore|cr|lakh|lacs?|%|percent)?/i);
    if (m) {
      rows.push([`${m[1]} ${m[3] ?? ""} ${period ? "FY" : ""}`, m[2]]);
    }
  }
  const extracted = extractFromRows(rows, "pdf", fyStartMonth);
  return extracted.map((p) => ({
    ...p,
    confidence: Math.min(p.confidence, 0.5),
    locator: { ...p.locator, page: 1, excerpt: p.excerpt },
  }));
}

function colName(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
