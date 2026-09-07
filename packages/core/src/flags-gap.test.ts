import { describe, expect, it } from "vitest";
import {
  detectCallConcern,
  detectCustomerConcentration,
  detectKeyPerson,
  detectOwnershipChange,
} from "./flags.js";
import { shouldAutoConfirm } from "./ops.js";
import { mergeExtractProposals, parseExtractAssistJson, parseCommentaryDraftJson } from "./propose.js";

describe("evidence-gated brief flags", () => {
  it("customer_concentration requires two reported values (missing ≠ 0)", () => {
    expect(detectCustomerConcentration(0.4, null)).toBeNull();
    expect(detectCustomerConcentration(0.4, 0.38)).toBeNull();
    expect(detectCustomerConcentration(0.5, 0.4)?.flagKey).toBe("customer_concentration");
  });

  it("ownership_change requires prior + current", () => {
    expect(detectOwnershipChange(0.12, null)).toBeNull();
    expect(detectOwnershipChange(0.12, 0.12)).toBeNull();
    expect(detectOwnershipChange(0.15, 0.12)?.flagKey).toBe("ownership_change");
  });

  it("key_person and call_concern need transcript evidence", () => {
    expect(detectKeyPerson([])).toBeNull();
    expect(detectKeyPerson([{ excerpt: "Revenue was flat." }])).toBeNull();
    expect(
      detectKeyPerson([{ excerpt: "The CEO resigned last week after the board call." }])?.flagKey,
    ).toBe("key_person");
    expect(detectCallConcern([{ excerpt: "Partners raised a concern on liquidity." }])?.flagKey).toBe(
      "call_concern",
    );
  });
});

describe("auto-confirm gate", () => {
  it("never auto-confirms without threshold, unit, or period", () => {
    expect(
      shouldAutoConfirm({
        confidence: 0.95,
        kind: "metric",
        unit: "crore",
        metricKey: "cash",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        companyId: "x",
        minConfidence: null,
      }),
    ).toBe(false);
    expect(
      shouldAutoConfirm({
        confidence: 0.95,
        kind: "metric",
        unit: "unknown",
        metricKey: "cash",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        companyId: "x",
        minConfidence: 0.9,
      }),
    ).toBe(false);
  });

  it("auto-confirms only high-confidence metrics with units", () => {
    expect(
      shouldAutoConfirm({
        confidence: 0.92,
        kind: "metric",
        unit: "crore",
        metricKey: "cash",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        companyId: "x",
        minConfidence: 0.9,
      }),
    ).toBe(true);
  });
});

describe("propose parsers", () => {
  it("drops unknown metric keys from LLM extract JSON", () => {
    const rows = parseExtractAssistJson(
      JSON.stringify({
        proposals: [
          { label: "Cash", metricKey: "cash", valueNumeric: 4.2, unit: "crore", currency: "INR", excerpt: "Cash 4.2" },
          { label: "Magic", metricKey: "invented_kpi", valueNumeric: 1, unit: "crore", currency: "INR" },
        ],
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.metricKey).toBe("cash");
  });

  it("merge keeps heuristic rows and adds new assists", () => {
    const heuristic = parseExtractAssistJson(
      JSON.stringify({
        proposals: [{ label: "Cash", metricKey: "cash", valueNumeric: 1, unit: "crore", currency: "INR" }],
      }),
    );
    const assisted = parseExtractAssistJson(
      JSON.stringify({
        proposals: [{ label: "Burn", metricKey: "burn", valueNumeric: 2, unit: "crore", currency: "INR" }],
      }),
    );
    expect(mergeExtractProposals(heuristic, assisted)).toHaveLength(2);
  });

  it("subjective draft rejects MIS-only source", () => {
    expect(parseCommentaryDraftJson('{"body":"Partners are worried."}', "subjective", "mis").ok).toBe(false);
    expect(parseCommentaryDraftJson('{"body":"Partners are worried about runway."}', "subjective", "transcript").ok).toBe(
      true,
    );
  });
});
