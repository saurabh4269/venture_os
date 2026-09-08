import { describe, expect, it } from "vitest";
import { formatOwnership, monthName, titleCaseKind } from "./format";

describe("formatOwnership", () => {
  it("keeps missing blank", () => {
    expect(formatOwnership(null)).toBe("");
    expect(formatOwnership(undefined)).toBe("");
    expect(formatOwnership(Number.NaN)).toBe("");
  });

  it("treats fractions as booked percents", () => {
    expect(formatOwnership(0.12)).toBe("12%");
    expect(formatOwnership(0.142)).toBe("14.2%");
  });

  it("leaves values above 1 as percents", () => {
    expect(formatOwnership(18.5)).toBe("18.5%");
  });
});

describe("monthName", () => {
  it("maps 1-12 and defaults missing to April", () => {
    expect(monthName(1)).toBe("January");
    expect(monthName(4)).toBe("April");
    expect(monthName(null)).toBe("April");
  });
});

describe("titleCaseKind", () => {
  it("labels known kinds without inventing", () => {
    expect(titleCaseKind("board_pack")).toBe("Board pack");
    expect(titleCaseKind("mis")).toBe("MIS");
  });
});
