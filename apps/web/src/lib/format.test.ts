import { describe, expect, it } from "vitest";
import { formatOwnership } from "./format";

describe("formatOwnership", () => {
  it("keeps missing as an em dash", () => {
    expect(formatOwnership(null)).toBe("—");
    expect(formatOwnership(undefined)).toBe("—");
    expect(formatOwnership(Number.NaN)).toBe("—");
  });

  it("treats fractions as booked percents", () => {
    expect(formatOwnership(0.12)).toBe("12%");
    expect(formatOwnership(0.142)).toBe("14.2%");
  });

  it("leaves values above 1 as percents", () => {
    expect(formatOwnership(18.5)).toBe("18.5%");
  });
});
