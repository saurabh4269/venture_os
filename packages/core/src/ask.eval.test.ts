import { describe, expect, it } from "vitest";
import { ASK_REFUSAL, decideAsk, refuseUnsourcedDigits, tokenize } from "./ask.js";

/**
 * Golden Ask cases on labelled fixture-shaped evidence.
 * Numbers that are not in the retrieved excerpts must refuse.
 * FIXTURE_ONLY — not a live book.
 */
const GOLDEN: {
  id: string;
  question: string;
  evidence: string;
  candidate: string;
  refuse: boolean;
}[] = [
  {
    id: "cash-grounded",
    question: "What was last confirmed cash?",
    evidence: "cash 4.2 crore INR 2026-03-31–2026-03-31 MIS FY26 M12 cell B12",
    candidate: "Last confirmed cash is 4.2 crore.",
    refuse: false,
  },
  {
    id: "cash-invented-99",
    question: "What was last confirmed cash?",
    evidence: "cash 4.2 crore INR 2026-03-31–2026-03-31 MIS FY26 M12 cell B12",
    candidate: "Cash is 99 crore.",
    refuse: true,
  },
  {
    id: "marketing-absent",
    question: "Which companies spend more than 2 Cr a year on marketing?",
    evidence: "net_revenue 12.4 crore INR 2026-03-31 cash 4.2 crore",
    candidate: "Three companies spend more than 2 Cr on marketing.",
    refuse: true,
  },
  {
    id: "runway-derived-ok",
    question: "What is runway?",
    evidence: "runway_months 6 months 2026-03-31 cash 12 crore burn 2 crore",
    candidate: "Runway is 6 months from cash 12 and burn 2.",
    refuse: false,
  },
  {
    id: "runway-invented-months",
    question: "What is runway?",
    evidence: "cash 12 crore burn 2 crore 2026-03-31",
    candidate: "Runway is 18 months.",
    refuse: true,
  },
  {
    id: "empty-corpus",
    question: "What is NAV?",
    evidence: "",
    candidate: "Fund NAV is 140.",
    refuse: true,
  },
  {
    id: "ownership-not-in-mis",
    question: "What is our ownership?",
    evidence: "net_revenue 8 crore cash 3 crore",
    candidate: "Ownership is 12.5 percent.",
    refuse: true,
  },
  {
    id: "zero-is-reported",
    question: "What was burn?",
    evidence: "burn 0 crore INR 2026-03-31 MIS cell D4",
    candidate: "Burn is 0 crore.",
    refuse: false,
  },
  {
    id: "dash-not-zero",
    question: "What was burn?",
    evidence: "burn — not reported 2026-03-31",
    candidate: "Burn is 0.",
    refuse: true,
  },
  {
    id: "cross-company-guess",
    question: "How many names have cash below 2 crore?",
    evidence: "Alpha cash 4.2 crore",
    candidate: "4 companies have cash below 2 crore.",
    refuse: true,
  },
  {
    id: "cited-alpha-cash",
    question: "What is Alpha cash?",
    evidence: "Alpha cash 4.2 crore MIS FY26 M12 cell B12",
    candidate: "Alpha cash is 4.2 crore.",
    refuse: false,
  },
  {
    id: "fx-invented",
    question: "What is cash in EUR?",
    evidence: "cash 4.2 crore INR 2026-03-31 — FX unavailable",
    candidate: "Cash is 0.46 EUR crore.",
    refuse: true,
  },
];

describe("Ask eval harness — refuse unsourced digits", () => {
  for (const g of GOLDEN) {
    it(`${g.id}: ${g.refuse ? "refuses" : "allows"}`, () => {
      const gate = refuseUnsourcedDigits(g.candidate, g.evidence);
      expect(gate.ok).toBe(!g.refuse);
      if (g.refuse && !gate.ok) expect(gate.invented.length).toBeGreaterThan(0);
    });
  }

  it("empty retrieval still refuses before any completion", () => {
    const d = decideAsk({ chunks: [], facts: [] }, tokenize("what is cash"));
    expect(d.ok).toBe(false);
    expect(ASK_REFUSAL).toMatch(/will not guess/i);
  });
});
