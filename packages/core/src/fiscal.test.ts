import { describe, expect, it } from "vitest";
import { lastCalendarQuarterEnd, parsePeriodHint } from "./fiscal.js";

describe("lastCalendarQuarterEnd", () => {
  it("returns the prior completed Mar/Jun/Sep/Dec", () => {
    expect(lastCalendarQuarterEnd(new Date("2026-09-04T12:00:00Z"))).toBe("2026-06-30");
    expect(lastCalendarQuarterEnd(new Date("2026-01-15T12:00:00Z"))).toBe("2025-12-31");
    expect(lastCalendarQuarterEnd(new Date("2026-04-01T00:00:00Z"))).toBe("2026-03-31");
  });
});

describe("parsePeriodHint", () => {
  it("parses Mon-YY and Mon YYYY headers", () => {
    expect(parsePeriodHint("Apr-25")?.start).toBe("2025-04-01");
    expect(parsePeriodHint("Aug 2025")?.end).toBe("2025-08-31");
  });

  it("parses FY26 Mn columns", () => {
    expect(parsePeriodHint("FY26 M1 (INR Cr)")?.start).toBe("2025-04-01");
    expect(parsePeriodHint("FY26 M6")?.end).toBe("2025-09-30");
  });
});
