import { describe, expect, it } from "vitest";
import {
  clusterItemsToRows,
  excerptAppearsInSource,
  numberAppearsInSource,
  shouldAbortExtractAssist,
  tablesFromPlainText,
  kvRowsFromPlainText,
} from "./pdf-layout.js";
import { extractFromPdfPages, extractFromPlainText } from "./extract.js";
import { filterProposalsAgainstSource, parseExtractAssistJson } from "./propose.js";

describe("pdf layout tables", () => {
  it("clusters positioned items into columns", () => {
    const rows = clusterItemsToRows([
      { str: "Metric", x: 10, y: 100, page: 1 },
      { str: "Value", x: 120, y: 100, page: 1 },
      { str: "Cash", x: 10, y: 80, page: 1 },
      { str: "4.2", x: 120, y: 80, page: 1 },
      { str: "Burn", x: 10, y: 60, page: 1 },
      { str: "1.1", x: 120, y: 60, page: 1 },
    ]);
    expect(rows[0]).toEqual(["Metric", "Value"]);
    expect(rows[1]).toEqual(["Cash", "4.2"]);
    const proposals = extractFromPdfPages(
      [{ page: 1, items: rows.flatMap(() => []), text: "" }],
      4,
    );
    // empty items page yields nothing — use real items path:
    const real = extractFromPdfPages(
      [
        {
          page: 2,
          items: [
            { str: "Metric", x: 10, y: 100, page: 2 },
            { str: "FY26 M5 INR Cr", x: 120, y: 100, page: 2 },
            { str: "Cash", x: 10, y: 80, page: 2 },
            { str: "4.2", x: 120, y: 80, page: 2 },
            { str: "Net revenue", x: 10, y: 60, page: 2 },
            { str: "12.4", x: 120, y: 60, page: 2 },
          ],
          text: "Cash 4.2 Net revenue 12.4",
        },
      ],
      4,
    );
    expect(real.find((p) => p.metricKey === "cash")?.valueNumeric).toBe(4.2);
    expect(real.find((p) => p.metricKey === "net_revenue")?.locator.page).toBe(2);
  });

  it("detects whitespace tables and KV lines in plain text", () => {
    const tables = tablesFromPlainText("Metric  Value\nCash    4.2\nBurn    1.1\n");
    expect(tables[0]?.[1]).toEqual(["Cash", "4.2"]);
    const kv = kvRowsFromPlainText("Closing cash: 4.2 crore\nMonthly burn: 1.1");
    expect(kv.some((r) => /cash/i.test(r[0]!))).toBe(true);
    const out = extractFromPlainText(
      "Metric  FY26 M5 INR Cr\nCash    4.2\nNet revenue  12.4\n",
      "pdf",
      4,
      0.5,
    );
    expect(out.find((p) => p.metricKey === "cash")?.valueNumeric).toBe(4.2);
  });
});

describe("cite-or-refuse", () => {
  it("numberAppearsInSource accepts formatted variants", () => {
    expect(numberAppearsInSource(4.2, "Cash balance is 4.2 crore")).toBe(true);
    expect(numberAppearsInSource(4.2, "Cash is 9.9")).toBe(false);
    expect(numberAppearsInSource(0.15, "growth 15% MoM")).toBe(true);
  });

  it("drops LLM proposals whose digits are not in the source", () => {
    const source = "MIS page: Closing cash 4.2 crore. Burn 1.1 crore.";
    const invented = parseExtractAssistJson(
      JSON.stringify({
        proposals: [
          {
            label: "Cash",
            metricKey: "cash",
            valueNumeric: 99.9,
            unit: "crore",
            currency: "INR",
            excerpt: "Cash 99.9",
          },
          {
            label: "Cash",
            metricKey: "cash",
            valueNumeric: 4.2,
            unit: "crore",
            currency: "INR",
            excerpt: "Closing cash 4.2 crore",
          },
        ],
      }),
      { sourceText: source },
    );
    expect(invented).toHaveLength(1);
    expect(invented[0]?.valueNumeric).toBe(4.2);
    expect(filterProposalsAgainstSource(invented, source)).toHaveLength(1);
  });

  it("aborts assist on empty or huge estimated cost sources", () => {
    expect(shouldAbortExtractAssist("hi").abort).toBe(true);
    expect(shouldAbortExtractAssist("x".repeat(80)).abort).toBe(false);
  });

  it("excerptAppearsInSource is strict about substrings", () => {
    expect(excerptAppearsInSource("Closing cash 4.2", "Closing cash 4.2 crore")).toBe(true);
    expect(excerptAppearsInSource("made up excerpt", "Closing cash 4.2")).toBe(false);
  });
});
