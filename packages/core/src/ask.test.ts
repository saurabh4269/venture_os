import { describe, expect, it } from "vitest";
import { ASK_REFUSAL, citationsFrom, decideAsk, inventedNumbers, refuseUnsourcedDigits } from "./ask.js";

describe("Ask refuse", () => {
  it("refuses when the corpus and book are empty", () => {
    const d = decideAsk({ chunks: [], facts: [] });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe("empty_corpus");
    expect(ASK_REFUSAL).toMatch(/will not guess/i);
  });

  it("refuses when retrieved text does not overlap the question tokens", () => {
    const d = decideAsk(
      {
        chunks: [
          {
            documentId: "00000000-0000-0000-0000-000000000002",
            sourceRefId: null,
            excerpt: "Board pack cover page only",
            rank: 1,
          },
        ],
        facts: [],
      },
      ["cash", "runway"],
    );
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe("no_overlap");
  });

  it("accepts when a resolving fact exists", () => {
    const d = decideAsk({
      chunks: [],
      facts: [
        {
          sourceRefId: "00000000-0000-0000-0000-000000000001",
          documentId: "00000000-0000-0000-0000-000000000002",
          excerpt: "Cash 4.2 crore — MIS FY26 M5 cell B12",
        },
      ],
    });
    expect(d.ok).toBe(true);
  });

  it("citations resolve to document / source_ref ids from evidence only", () => {
    const cites = citationsFrom({
      chunks: [
        {
          documentId: "00000000-0000-0000-0000-000000000002",
          sourceRefId: "00000000-0000-0000-0000-000000000001",
          excerpt: "Net revenue 12.4",
          rank: 1,
        },
      ],
      facts: [],
    });
    expect(cites[0]?.documentId).toBe("00000000-0000-0000-0000-000000000002");
    expect(cites[0]?.sourceRefId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("flags numerals that do not appear in evidence", () => {
    expect(inventedNumbers("Cash is 99 crore", "cash 4.2 crore")).toEqual(["99"]);
    expect(inventedNumbers("Cash is 4.2 crore", "cash 4.2 crore")).toEqual([]);
  });

  it("refuses when the question invents figures even if a book extract is grounded", () => {
    const gate = refuseUnsourcedDigits(
      "From the book:\ncash 4.2 crore INR",
      "cash 4.2 crore INR 2025-08-31",
      "What was confirmed cash of 888 crore in FY 2099?",
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.invented).toEqual(expect.arrayContaining(["888", "2099"]));
  });
});
