import { a1ToRC, colToLetter } from "@venture-os/core";
import ExcelJS from "exceljs";

export type SheetPreviewTile = {
  sheet: string;
  sheets: string[];
  /** 1-based inclusive window */
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
  highlight: { row: number; col: number; a1: string } | null;
  /** values[r][c] relative to window origin */
  values: (string | number | null)[][];
};

/**
 * Bounded sheet window around a cell for Cite viewer.
 * Enough for MIS packs without loading a full-sheet DOM.
 */
export async function buildSheetPreview(
  buf: Buffer,
  opts: { sheet?: string | null; cell?: string | null; rowPad?: number; colPad?: number },
): Promise<SheetPreviewTile | null> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const names: string[] = [];
  wb.eachSheet((s) => names.push(s.name));
  if (!names.length) return null;

  const want = (opts.sheet ?? "").trim().toLowerCase();
  const sheet =
    (want ? wb.worksheets.find((s) => s.name.toLowerCase() === want) : null) ?? wb.worksheets[0]!;
  const rc = opts.cell ? a1ToRC(opts.cell) : null;
  const rowPad = opts.rowPad ?? 12;
  const colPad = opts.colPad ?? 6;
  const focusRow = rc?.row ?? 1;
  const focusCol = rc?.col ?? 1;
  const rowStart = Math.max(1, focusRow - rowPad);
  const rowEnd = focusRow + rowPad;
  const colStart = Math.max(1, focusCol - colPad);
  const colEnd = focusCol + colPad;

  const values: (string | number | null)[][] = [];
  for (let r = rowStart; r <= rowEnd; r++) {
    const rowVals: (string | number | null)[] = [];
    for (let c = colStart; c <= colEnd; c++) {
      const cell = sheet.getRow(r).getCell(c);
      const v = cell.value;
      if (v == null) rowVals.push(null);
      else if (typeof v === "number" || typeof v === "string") rowVals.push(v);
      else if (typeof v === "object" && v && "text" in v) rowVals.push(String((v as { text: string }).text));
      else if (typeof v === "object" && v && "result" in v) {
        const res = (v as { result?: unknown }).result;
        rowVals.push(typeof res === "number" || typeof res === "string" ? res : String(res ?? ""));
      } else rowVals.push(String(v));
    }
    values.push(rowVals);
  }

  return {
    sheet: sheet.name,
    sheets: names,
    rowStart,
    rowEnd,
    colStart,
    colEnd,
    highlight: rc
      ? { row: rc.row, col: rc.col, a1: `${colToLetter(rc.col)}${rc.row}` }
      : null,
    values,
  };
}
