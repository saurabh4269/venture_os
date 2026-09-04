import { describe, expect, it } from "vitest";
import { safeNextPath } from "@venture-os/config/paths";

describe("safeNextPath (web)", () => {
  it("accepts in-app paths and rejects open redirects", () => {
    expect(safeNextPath("/command")).toBe("/command");
    expect(safeNextPath("//evil.example/phish")).toBe("/command");
  });
});
