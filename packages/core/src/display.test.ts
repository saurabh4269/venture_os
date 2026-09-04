import { describe, expect, it } from "vitest";
import { formatDualDisplay } from "./display.js";

describe("dual currency display", () => {
  it("shows EUR only when the FX triple is complete", () => {
    const d = formatDualDisplay({
      value: 10,
      sourceRefId: "ref-1",
      unit: "crore",
      currency: "INR",
      valueEur: 0.11,
      fxRate: 0.011,
      fxDate: "2026-09-01",
      fxSource: "RBI",
    });
    expect(d.isFact).toBe(true);
    expect(d.conversionRefused).toBe(false);
    expect(d.fxNote).toContain("0.011");
    expect(d.fxNote).toContain("2026-09-01");
    expect(d.fxNote).toContain("RBI");
  });

  it("refuses conversion when rate, date, or source is missing", () => {
    const d = formatDualDisplay({
      value: 10,
      sourceRefId: "ref-1",
      unit: "crore",
      currency: "INR",
      valueEur: 0.11,
      fxRate: 0.011,
      fxDate: "2026-09-01",
    });
    expect(d.conversionRefused).toBe(true);
    expect(d.converted).toBe("—");
    expect(d.fxNote).toBe("EUR — (no FX triple)");
    expect(d.display).toContain("10");
  });
});
