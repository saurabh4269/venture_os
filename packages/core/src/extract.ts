import type { Currency, Grain, Locator, MetricKey, Unit } from "@venture-os/schema";
import { METRIC_CATALOG, matchMetricAlias, metricByKey } from "./catalog.js";
import { parsePeriodHint } from "./fiscal.js";
import {
  clusterItemsToRows,
  kvRowsFromPlainText,
  tablesFromPlainText,
  type PdfPageBundle,
  type PdfTextItem,
} from "./pdf-layout.js";
import { suggestCatalogMetricFuzzy } from "./fuzzy-rank.js";
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

/** Explicit dash in a matched metric cell is missing, not a skipped blank. */
function isExplicitMissingMarker(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  return /^[-–—]+$/.test(raw.trim());
}

export function extractFromRows(
  rows: unknown[][],
  sheet: string,
  fyStartMonth = 4,
  catalog: import("./catalog.js").MetricDef[] = METRIC_CATALOG,
): ExtractedProposal[] {
  const out: ExtractedProposal[] = [];
  const headerRow = (rows[0] ?? []).map((c) => String(c ?? ""));
  const header = headerRow.join(" ");
  const sheetPeriod = parsePeriodHint(`${sheet} ${header}`, fyStartMonth);
  const headerUnit = detectUnit(`${header} ${sheet}`);
  const headerCurrency = detectCurrency(`${header} ${sheet}`);
  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    const row = rows[r] ?? [];
    const label = String(row[0] ?? "").trim();
    if (!label) continue;
    const labelPeriod = parsePeriodHint(label, fyStartMonth);
    const headerCtx = `${label} ${header} ${sheet}`;
    const unitDetect = detectUnit(headerCtx);
    const resolvedUnit = unitDetect === "unknown" ? headerUnit : unitDetect;
    const currency =
      detectCurrency(headerCtx) === "unknown" ? headerCurrency : detectCurrency(headerCtx);
    for (let c = 1; c < Math.min(row.length, 16); c++) {
      const valueNumeric = parseNumber(row[c]);
      if (valueNumeric === null && row[c] !== 0 && !isExplicitMissingMarker(row[c])) continue;
      const colPeriod = parsePeriodHint(headerRow[c] ?? "", fyStartMonth);
      const period = colPeriod ?? labelPeriod ?? sheetPeriod;
      const cell = `${colName(c)}${r + 1}`;
      const headerBits = headerRow[c]?.trim()
        ? ` · ${headerRow[c]!.trim().slice(0, 80)}`
        : header.trim()
          ? ` · ${header.trim().slice(0, 80)}`
          : "";
      const excerpt = `${label} → ${row[c]}${headerBits}`;
      const def = matchMetricAlias(label, catalog);
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
      let matched = def;
      let fuzzyBoost = false;
      if (!matched) {
        // Careful: fuzzy only proposes; confidence capped; never auto-books.
        const hint = suggestCatalogMetricFuzzy(label, METRIC_CATALOG, { threshold: 0.9 });
        if (!hint) continue;
        matched = metricByKey(hint.key as MetricKey);
        if (!matched) continue;
        fuzzyBoost = true;
      }
      const unit: Unit = resolvedUnit === "unknown" ? matched.defaultUnit : resolvedUnit;
      out.push({
        kind: "metric",
        metricKey: matched.key,
        label,
        valueNumeric,
        unit,
        currency: matched.unitFamily === "money" ? currency : "unknown",
        periodStart: period?.start,
        periodEnd: period?.end,
        grain: period?.grain ?? "month",
        confidence: fuzzyBoost
          ? 0.48
          : resolvedUnit === "unknown"
            ? 0.55
            : 0.82,
        locator: { sheet, cell, excerpt },
        excerpt,
        lane: "objective",
      });
    }
  }
  return out;
}

export function extractFromPdfText(text: string, fyStartMonth = 4): ExtractedProposal[] {
  return extractFromPlainText(text, "pdf", fyStartMonth, 0.5);
}

/**
 * Table-aware plain text / PDF text path.
 * Prefers whitespace|pipe tables → extractFromRows; falls back to KV lines.
 * Confidence capped until layout OCR / bbox exists.
 */
export function extractFromPlainText(
  text: string,
  sheet: string,
  fyStartMonth = 4,
  confidenceCap = 0.5,
): ExtractedProposal[] {
  const out: ExtractedProposal[] = [];
  const tables = tablesFromPlainText(text);
  for (let i = 0; i < tables.length; i++) {
    const sheetName = tables.length > 1 ? `${sheet}:t${i + 1}` : sheet;
    out.push(...extractFromRows(tables[i]!, sheetName, fyStartMonth));
  }
  if (out.length === 0) {
    const kv = kvRowsFromPlainText(text);
    if (kv.length) out.push(...extractFromRows(kv, sheet, fyStartMonth));
  }
  return out.map((p) => ({
    ...p,
    confidence: Math.min(p.confidence, confidenceCap),
    locator: {
      ...p.locator,
      page: p.locator.page ?? (sheet.startsWith("pdf") ? 1 : undefined),
      excerpt: p.excerpt,
    },
  }));
}

/**
 * Positioned PDF pages (from pdfjs). Builds per-page tables with page locators.
 * Higher confidence than plain text when multi-column grids are detected.
 */
export function extractFromPdfPages(
  pages: PdfPageBundle[],
  fyStartMonth = 4,
): ExtractedProposal[] {
  const out: ExtractedProposal[] = [];
  for (const page of pages) {
    const grid = clusterItemsToRows(page.items);
    const sheet = `pdf:p${page.page}`;
    if (grid.length >= 2 && grid.some((r) => r.length >= 2)) {
      const proposals = extractFromRows(grid, sheet, fyStartMonth).map((p) => ({
        ...p,
        confidence: Math.min(p.confidence, 0.72),
        locator: { ...p.locator, page: page.page, excerpt: p.excerpt },
      }));
      out.push(...proposals);
    } else if (page.text.trim()) {
      out.push(
        ...extractFromPlainText(page.text, sheet, fyStartMonth, 0.55).map((p) => ({
          ...p,
          locator: { ...p.locator, page: page.page },
        })),
      );
    }
  }
  // Dedupe identical metric+period+value across overlapping strategies
  return dedupeProposals(out);
}

function dedupeProposals(rows: ExtractedProposal[]): ExtractedProposal[] {
  const seen = new Set<string>();
  const out: ExtractedProposal[] = [];
  for (const p of rows) {
    const k = `${p.metricKey ?? p.label}|${p.periodEnd ?? ""}|${p.valueNumeric}|${p.unit}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
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

export type { PdfPageBundle, PdfTextItem };
