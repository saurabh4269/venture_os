/**
 * Excel A1 / sheet-name parsers.
 * Used to gate jump-to-source and canonicalize dirty refs — never invents cells.
 */

const QUALIFIED_REF = /^(?:'([^']+)'|([^!]+))!([A-Z]+\d+)$/i;
const CELL_ONLY = /^[A-Z]+\d+$/i;
const TOKEN_DELIMITERS = /[,;|]|\s+and\s+/i;

function stripQuotes(value: string): string {
  return value.replace(/^'(.*)'$/, "$1").trim();
}

/** 1-based column → Excel letters. */
export function colToLetter(col: number): string {
  let n = col;
  let letter = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/** "B5" → { row, col } 1-based, or null. */
export function a1ToRC(a1: string): { row: number; col: number } | null {
  const match = /^([A-Z]+)(\d+)$/i.exec(String(a1).toUpperCase());
  if (!match) return null;
  let col = 0;
  for (const ch of match[1]!) {
    col = col * 26 + (ch.charCodeAt(0) - 64);
  }
  return { row: parseInt(match[2]!, 10), col };
}

export function parseMultipleCells(cellRef: string | null | undefined): {
  validCells: string[];
  allCells: string[];
  embeddedSheets: string[];
  hasInvalidFormat: boolean;
} {
  if (!cellRef || typeof cellRef !== "string") {
    return { validCells: [], allCells: [], embeddedSheets: [], hasInvalidFormat: false };
  }
  const tokens = cellRef
    .split(TOKEN_DELIMITERS)
    .map((t) => t.trim())
    .filter(Boolean);
  const validCells: string[] = [];
  const embeddedSheets: string[] = [];
  let hasInvalidFormat = false;
  for (const token of tokens) {
    if (CELL_ONLY.test(token)) {
      validCells.push(token.toUpperCase());
      continue;
    }
    const match = QUALIFIED_REF.exec(token);
    if (match) {
      validCells.push(match[3]!.toUpperCase());
      const sheet = stripQuotes((match[1] || match[2] || "").trim());
      if (sheet && !embeddedSheets.some((s) => s.toLowerCase() === sheet.toLowerCase())) {
        embeddedSheets.push(sheet);
      }
    } else {
      hasInvalidFormat = true;
    }
  }
  return { validCells, allCells: tokens, embeddedSheets, hasInvalidFormat };
}

export function parseMultipleSheets(
  sheetName: string | string[] | null | undefined,
  availableSheets: string[] = [],
): {
  sheets: string[];
  validSheets: string[];
  hasMultipleSheets: boolean;
  allValid: boolean;
  someValid: boolean;
} {
  const empty = {
    sheets: [] as string[],
    validSheets: [] as string[],
    hasMultipleSheets: false,
    allValid: false,
    someValid: false,
  };
  const raw = Array.isArray(sheetName) ? sheetName : [sheetName];
  const cleaned = raw
    .filter((n): n is string => typeof n === "string")
    .map((n) => stripQuotes(n.trim()))
    .filter(Boolean);
  if (!cleaned.length) return empty;

  const canonical = (name: string) =>
    availableSheets.find((s) => s.toLowerCase() === name.toLowerCase());

  const sheets = cleaned.flatMap((name) =>
    canonical(name)
      ? [name]
      : name
          .split(TOKEN_DELIMITERS)
          .map((p) => stripQuotes(p.trim()))
          .filter(Boolean),
  );
  const validSheets = sheets.map(canonical).filter((s): s is string => Boolean(s));
  return {
    sheets,
    validSheets,
    hasMultipleSheets: sheets.length > 1,
    allValid: sheets.length > 0 && validSheets.length === sheets.length,
    someValid: validSheets.length > 0,
  };
}

export type SourceLocator = {
  sheet?: string | null;
  cell?: string | null;
  page?: number | null;
  bbox?: [number, number, number, number] | null;
  excerpt?: string | null;
};

/**
 * Jump-to-source gate for book locators.
 * Jump is allowed only when we have a concrete sheet+cell or a page (PDF).
 * Missing is not inventable.
 */
export function canHighlightSource(
  locator: SourceLocator | null | undefined,
  opts?: { availableSheets?: string[] },
): { ok: true; kind: "cell" | "page" } | { ok: false; reason: string } {
  if (!locator) return { ok: false, reason: "no_locator" };
  if (locator.page != null && Number.isFinite(locator.page) && locator.page >= 1) {
    return { ok: true, kind: "page" };
  }
  const cells = parseMultipleCells(locator.cell ?? undefined);
  if (!cells.validCells.length) return { ok: false, reason: "no_cell" };
  if (cells.hasInvalidFormat && !cells.validCells.length) {
    return { ok: false, reason: "invalid_cell" };
  }
  // Cell-only is allowed — preview defaults to first sheet. When an availableSheets
  // list is provided, a named sheet must resolve (never invent sheet names).
  if (opts?.availableSheets?.length) {
    const sheets = parseMultipleSheets(
      locator.sheet ?? cells.embeddedSheets[0] ?? null,
      opts.availableSheets,
    );
    if (locator.sheet || cells.embeddedSheets.length) {
      if (!sheets.someValid) return { ok: false, reason: "sheet_not_found" };
    }
  }
  return { ok: true, kind: "cell" };
}
