import { describe, expect, it } from "vitest";
import { simplePdf } from "./reports-export.js";

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