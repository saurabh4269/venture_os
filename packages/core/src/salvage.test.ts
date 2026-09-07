import { describe, expect, it } from "vitest";
import { salvageJsonRoot, salvageListItems } from "./salvage.js";

describe("salvage", () => {
  it("strips fences and recovers object", () => {
    const raw = "```json\n{\"proposals\":[{\"label\":\"Cash\",\"valueNumeric\":1}]}\n```";
    const root = salvageJsonRoot(raw) as { proposals: unknown[] };
    expect(root?.proposals).toHaveLength(1);
  });

  it("salvages per-item from truncated array", () => {
    const root = {
      proposals: [{ label: "ok", valueNumeric: 1 }, "bad", { label: "two", valueNumeric: 2 }],
    };
    const items = salvageListItems(
      root,
      (x): x is { label: string } => Boolean(x && typeof x === "object" && "label" in x),
      12,
    );
    expect(items.map((i) => i.label)).toEqual(["ok", "two"]);
  });

  it("returns null on garbage", () => {
    expect(salvageJsonRoot("not json at all {{{")).toBeNull();
  });
});
