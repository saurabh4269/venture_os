import { describe, expect, it } from "vitest";
import { PARSE_STALL_MS, deriveParsePhase, parsePhaseLabel } from "./job-phase.js";

describe("job-phase", () => {
  it("maps terminal and queued statuses", () => {
    expect(deriveParsePhase({ status: "done" })).toBe("done");
    expect(deriveParsePhase({ status: "error", error: "boom" })).toBe("error");
    expect(deriveParsePhase({ status: "queued" })).toBe("queued");
    expect(parsePhaseLabel("stalled")).toBe("Stalled");
  });

  it("flags stall after PARSE_STALL_MS", () => {
    const startedAt = new Date(Date.now() - PARSE_STALL_MS - 1_000);
    expect(deriveParsePhase({ status: "running", startedAt })).toBe("stalled");
    expect(deriveParsePhase({ status: "running", startedAt: new Date() })).toBe("running");
  });
});
