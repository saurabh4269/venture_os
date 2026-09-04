import { describe, expect, it } from "vitest";
import { assertCommentaryLane, documentKindToCommentarySource } from "./commentary.js";

describe("commentary lanes", () => {
  it("rejects subjective drafts from MIS-only input", () => {
    expect(assertCommentaryLane("subjective", "mis")).toEqual({
      ok: false,
      code: "subjective_rejects_mis_only",
    });
  });

  it("allows objective from MIS and subjective from transcript or human judgement", () => {
    expect(assertCommentaryLane("objective", "mis").ok).toBe(true);
    expect(assertCommentaryLane("subjective", "transcript").ok).toBe(true);
    expect(assertCommentaryLane("subjective", "human").ok).toBe(true);
  });

  it("maps known document kinds without inventing vendor fields", () => {
    expect(documentKindToCommentarySource("mis")).toBe("mis");
    expect(documentKindToCommentarySource("transcript")).toBe("transcript");
    expect(documentKindToCommentarySource("other")).toBe("human");
  });
});
