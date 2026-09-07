/**
 * PDF / plain-text layout helpers for MIS ingest.
 * Pure functions — no PDF library dependency in core.
 * Callers supply text items (from pdfjs) or raw page text (from pdf-parse).
 */

export const MAX_PDF_ASSIST_PAGES = 50;
export const MAX_PDF_ASSIST_CHARS = 14_000;
/** Soft cost gate before LLM assist (USD estimate). Org can still run if under. */
export const EXTRACT_ASSIST_COST_ABORT_USD = 0.15;

export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  page: number;
  width?: number;
};

export type PdfPageBundle = {
  page: number;
  items: PdfTextItem[];
  text: string;
};

/** Rough token/cost estimate for extract-assist preflight. */
export function estimateExtractAssistCostUsd(
  sourceText: string,
  opts?: { inputPerMTok?: number; outputPerMTok?: number; maxOutTokens?: number },
): number {
  const inPerM = opts?.inputPerMTok ?? 0.15; // gpt-4o-mini ballpark
  const outPerM = opts?.outputPerMTok ?? 0.6;
  const maxOut = opts?.maxOutTokens ?? 1200;
  const inTok = Math.ceil(sourceText.length / 4);
  return (inTok / 1_000_000) * inPerM + (maxOut / 1_000_000) * outPerM;
}

export function shouldAbortExtractAssist(sourceText: string): {
  abort: boolean;
  reason?: string;
  estimatedUsd: number;
  chars: number;
} {
  const chars = sourceText.length;
  const estimatedUsd = estimateExtractAssistCostUsd(sourceText);
  if (chars < 40) return { abort: true, reason: "source_too_short", estimatedUsd, chars };
  if (estimatedUsd > EXTRACT_ASSIST_COST_ABORT_USD) {
    return { abort: true, reason: "estimated_cost_high", estimatedUsd, chars };
  }
  return { abort: false, estimatedUsd, chars };
}

/** Cap pages for assist / layout parse. Financial packs usually front-load KPIs. */
export function capPdfPages<T>(pages: T[], max = MAX_PDF_ASSIST_PAGES): T[] {
  return pages.slice(0, Math.max(1, max));
}

/**
 * Cluster positioned glyphs into row×column grid (pdfplumber-style heuristic).
 * Y tolerance groups a line; X gaps split columns.
 */
export function clusterItemsToRows(
  items: PdfTextItem[],
  opts?: { yTolerance?: number; xGap?: number },
): string[][] {
  const yTol = opts?.yTolerance ?? 3.5;
  const xGap = opts?.xGap ?? 12;
  const usable = items
    .map((it) => ({ ...it, str: it.str.replace(/\s+/g, " ").trim() }))
    .filter((it) => it.str.length > 0);
  if (!usable.length) return [];

  // PDF y often grows upward — sort top-to-bottom then left-to-right.
  usable.sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: { y: number; cells: { x: number; str: string }[] }[] = [];
  for (const it of usable) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= yTol);
    if (line) {
      line.cells.push({ x: it.x, str: it.str });
      line.y = (line.y * (line.cells.length - 1) + it.y) / line.cells.length;
    } else {
      lines.push({ y: it.y, cells: [{ x: it.x, str: it.str }] });
    }
  }

  const rows: string[][] = [];
  for (const line of lines) {
    line.cells.sort((a, b) => a.x - b.x);
    const cols: string[] = [];
    let cur = line.cells[0]!.str;
    let lastX = line.cells[0]!.x;
    for (let i = 1; i < line.cells.length; i++) {
      const c = line.cells[i]!;
      if (c.x - lastX > xGap) {
        cols.push(cur.trim());
        cur = c.str;
      } else {
        cur = `${cur} ${c.str}`.replace(/\s+/g, " ");
      }
      lastX = c.x;
    }
    cols.push(cur.trim());
    if (cols.some((c) => c.length)) rows.push(cols);
  }
  return rows;
}

/**
 * Detect whitespace / pipe-aligned tables in plain PDF text (no coordinates).
 * Returns candidate row matrices for extractFromRows.
 */
export function tablesFromPlainText(text: string): string[][][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, "  ").trimEnd())
    .filter((l) => l.trim().length > 0);
  const tables: string[][][] = [];
  let buf: string[][] = [];

  const flush = () => {
    if (buf.length >= 2) tables.push(buf);
    buf = [];
  };

  for (const line of lines) {
    const pipe = line.includes("|")
      ? line
          .split("|")
          .map((c) => c.trim())
          .filter((c, i, a) => !(c === "" && (i === 0 || i === a.length - 1)))
      : null;
    const multi =
      !pipe && /\S\s{2,}\S/.test(line)
        ? line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean)
        : null;
    const cells = pipe && pipe.length >= 2 ? pipe : multi && multi.length >= 2 ? multi : null;
    if (cells) {
      buf.push(cells);
    } else {
      flush();
    }
  }
  flush();
  return tables;
}

/** Key-value style lines: "Cash: 4.2 crore" / "Net revenue 12.4". */
export function kvRowsFromPlainText(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(
      /^(.{2,48}?)(?:\s*[:\-–—]\s+|\s{2,})(-?[\d,.]+)\s*(crore|cr|lakh|lacs?|%|percent|months?)?/i,
    );
    if (m) {
      rows.push([`${m[1]} ${m[3] ?? ""}`.trim(), m[2]!]);
    }
  }
  return rows;
}

/**
 * Normalize a number for source citation checks.
 * Accepts 4.2, 4,20 (EU decimal), 4,200, ₹4.2 Cr fragments in text.
 */
export function numberAppearsInSource(value: number | null | undefined, sourceText: string): boolean {
  if (value == null || !Number.isFinite(value)) return false;
  const src = sourceText.replace(/\u00a0/g, " ");
  const abs = Math.abs(value);
  const candidates = new Set<string>();
  candidates.add(String(value));
  candidates.add(abs.toString());
  if (Number.isInteger(abs)) {
    candidates.add(String(abs));
    candidates.add(abs.toLocaleString("en-IN"));
    candidates.add(abs.toLocaleString("en-US"));
  } else {
    const fixed2 = abs.toFixed(2).replace(/\.?0+$/, "");
    const fixed1 = abs.toFixed(1);
    candidates.add(fixed2);
    candidates.add(fixed1);
    candidates.add(abs.toFixed(2));
    // EU-style decimal comma
    candidates.add(fixed2.replace(".", ","));
    candidates.add(fixed1.replace(".", ","));
  }
  for (const c of candidates) {
    if (!c || c === "0" && abs !== 0) continue;
    if (src.includes(c)) return true;
  }
  // Percentage stored as 0.15 vs "15%"
  if (abs > 0 && abs < 1) {
    const pct = Math.round(abs * 1000) / 10; // one decimal
    const pctInt = Math.round(abs * 100);
    if (src.includes(`${pct}%`) || src.includes(`${pctInt}%`) || src.includes(String(pctInt))) {
      return true;
    }
  }
  return false;
}

/** Excerpt must be a real substring (loose whitespace). */
export function excerptAppearsInSource(excerpt: string, sourceText: string): boolean {
  const ex = excerpt.replace(/\s+/g, " ").trim();
  if (ex.length < 3) return false;
  const src = sourceText.replace(/\s+/g, " ");
  if (src.includes(ex)) return true;
  // Allow label→value style excerpts when both halves appear
  const parts = ex.split(/\s*[→\-–—]\s*/);
  if (parts.length === 2) {
    return src.toLowerCase().includes(parts[0]!.trim().toLowerCase()) && numberLikeInSource(parts[1]!, src);
  }
  return false;
}

function numberLikeInSource(fragment: string, src: string): boolean {
  const n = Number(String(fragment).replace(/[, ]/g, "").replace(/[₹$€£%]/g, ""));
  if (Number.isFinite(n)) return numberAppearsInSource(n, src);
  return src.includes(fragment.trim());
}

export function clipAssistSource(text: string, maxChars = MAX_PDF_ASSIST_CHARS): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}
