import { describe, expect, it } from "vitest";
import { lastCalendarQuarterEnd } from "./fiscal.js";

describe("lastCalendarQuarterEnd", () => {
  it("returns the prior completed Mar/Jun/Sep/Dec", () => {
    expect(lastCalendarQuarterEnd(new Date("2026-09-04T12:00:00Z"))).toBe("2026-06-30");
    expect(lastCalendarQuarterEnd(new Date("2026-01-15T12:00:00Z"))).toBe("2025-12-31");
    expect(lastCalendarQuarterEnd(new Date("2026-04-01T00:00:00Z"))).toBe("2026-03-31");
  });
});