import { describe, expect, it } from "vitest";
import { ASK_REFUSAL, citationsFrom, decideAsk } from "./ask.js";

describe("Ask refuse", () => {
  it("refuses when the corpus and book are empty", () => {
    const d = decideAsk({ chunks: [], facts: [] });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe("empty_corpus");
    expect(ASK_REFUSAL).toMatch(/will not guess/i);
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
});
