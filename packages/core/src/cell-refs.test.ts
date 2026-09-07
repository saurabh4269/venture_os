import { describe, expect, it } from "vitest";
import {
  a1ToRC,
  canHighlightSource,
  colToLetter,
  parseMultipleCells,
} from "./cell-refs.js";

describe("cell-refs", () => {
  it("colToLetter / a1ToRC round-trip basics", () => {
    expect(colToLetter(1)).toBe("A");
    expect(colToLetter(27)).toBe("AA");
    expect(a1ToRC("B12")).toEqual({ row: 12, col: 2 });
    expect(a1ToRC("??")).toBeNull();
  });

  it("parseMultipleCells accepts qualified refs", () => {
    const r = parseMultipleCells("'P&L'!C4, D5");
    expect(r.validCells).toEqual(["C4", "D5"]);
    expect(r.embeddedSheets).toEqual(["P&L"]);
  });

  it("canHighlightSource requires page or cell; cell-only ok without sheet list", () => {
    expect(canHighlightSource(null).ok).toBe(false);
    expect(canHighlightSource({ page: 2 })).toEqual({ ok: true, kind: "page" });
    expect(canHighlightSource({ cell: "B5" })).toEqual({ ok: true, kind: "cell" });
    expect(canHighlightSource({ sheet: "MIS", cell: "B5" })).toEqual({ ok: true, kind: "cell" });
    expect(
      canHighlightSource({ sheet: "Nope", cell: "B5" }, { availableSheets: ["MIS"] }).ok,
    ).toBe(false);
  });
});
