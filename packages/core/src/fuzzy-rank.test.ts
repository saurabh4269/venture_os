import { describe, expect, it } from "vitest";
import {
  evidenceStatusOf,
  rankFuzzyCandidates,
  suggestCatalogMetricFuzzy,
  tokenRatio,
} from "./fuzzy-rank.js";

describe("fuzzy-rank", () => {
  it("tokenRatio exact and partial", () => {
    expect(tokenRatio("Net Revenue", "net revenue")).toBe(1);
    expect(tokenRatio("cash", "closing cash")).toBeGreaterThan(0.3);
  });

  it("ranks exact and numeric ±1%", () => {
    const hits = rankFuzzyCandidates(
      { text: "12.0", numeric: 12 },
      [
        { id: "a", value: "12.0", numeric: 12 },
        { id: "b", value: "other", numeric: 12.05 },
        { id: "c", value: "nope", numeric: 99 },
      ],
      { threshold: 0.9 },
    );
    expect(hits[0]?.id).toBe("a");
    expect(hits.some((h) => h.id === "b" && h.mode === "numeric")).toBe(true);
    expect(hits.some((h) => h.id === "c")).toBe(false);
  });

  it("suggestCatalogMetricFuzzy caps confidence and never invents", () => {
    const hit = suggestCatalogMetricFuzzy("Kash balance", [
      { key: "cash", label: "Cash", aliases: ["closing cash", "cash balance", "bank balance"] },
      { key: "burn", label: "Burn", aliases: ["net burn"] },
    ]);
    expect(hit?.key).toBe("cash");
    expect(hit!.confidence).toBeLessThanOrEqual(0.55);

    expect(
      suggestCatalogMetricFuzzy("completely unrelated gibberish xyz", [
        { key: "cash", label: "Cash", aliases: ["cash"] },
      ]),
    ).toBeNull();
  });

  it("evidenceStatusOf — unverifiable ≠ wrong", () => {
    expect(evidenceStatusOf({ confidence: 0.9, hasLocator: true })).toBe("cited");
    expect(evidenceStatusOf({ confidence: 0.3, hasLocator: true })).toBe("weak");
    expect(evidenceStatusOf({ confidence: 0.9, hasLocator: false })).toBe("unverifiable");
    expect(evidenceStatusOf({ confidence: 0.9, hasLocator: true, unitUnknown: true })).toBe("weak");
  });
});
