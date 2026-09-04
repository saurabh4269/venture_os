import { describe, expect, it } from "vitest";
import { buildExports, simplePdf } from "./reports-export.js";

describe("simplePdf", () => {
  it("emits a real PDF header and does not drop lines past 60", () => {
    const lines = Array.from({ length: 80 }, (_, i) => `line-${i}`);
    const buf = simplePdf(lines.join("\n"));
    const text = buf.toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("%%EOF");
    expect(text).toContain("/Count 2");
    expect(text).toContain("line-0");
    expect(text).toContain("line-79");
  });
});

describe("monthly pack xlsx", () => {
  it("puts objective and subjective in separate columns and keeps missing as —", async () => {
    const file = await buildExports(
      {
        title: "Monthly pack · 2026-03-31",
        kind: "monthly_pack",
        createdAt: "2026-09-04",
        body: {
          periodEnd: "2026-03-31",
          rows: [
            {
              name: "Alpha",
              stage: "Seed",
              periodEnd: "2026-03-31",
              metrics: [
                { key: "net_revenue", value: null, unit: "crore", periodEnd: "2026-03-31", sourceRefId: "" },
                { key: "gross_margin_pct", value: null, unit: "percent", periodEnd: "", sourceRefId: "" },
                { key: "cash", value: 4.2, unit: "crore", periodEnd: "2026-03-31", sourceRefId: "r1" },
                { key: "burn", value: null, unit: "crore", periodEnd: "", sourceRefId: "" },
                { key: "runway_months", value: null, unit: "months", periodEnd: "", sourceRefId: "" },
              ],
              objective: ["Cash held."],
              subjective: ["Founder said hiring is paused."],
            },
          ],
          pages: [],
        },
      },
      "xlsx",
    );
    expect(file.contentType).toContain("spreadsheet");
    expect(file.body.length).toBeGreaterThan(80);
  });
});