import { describe, expect, it } from "vitest";
import { navBridge, rollupNav } from "./nav.js";

describe("NAV rollup", () => {
  it("keeps MOIC blank when a position is unmarked", () => {
    const r = rollupNav("2026-09-01", [
      { positionId: "1", companyId: "a", companyName: "Alpha", cost: 10, mark: 12, markAsOf: "2026-09-01" },
      { positionId: "2", companyId: "b", companyName: "Beta", cost: 4, mark: null, markAsOf: null },
    ]);
    expect(r.moic).toBeNull();
    expect(r.nav.complete).toBe(false);
    expect(r.unmarked.map((u) => u.companyName)).toEqual(["Beta"]);
  });
});

describe("NAV bridge", () => {
  it("computes period-over-period delta only when both marks exist", () => {
    const current = [
      { positionId: "1", companyId: "a", companyName: "Alpha", cost: 10, mark: 14, markAsOf: "2026-09-01" },
    ];
    const prior = [
      { positionId: "1", companyId: "a", companyName: "Alpha", cost: 10, mark: 12, markAsOf: "2026-06-01" },
    ];
    const b = navBridge("2026-09-01", current, prior);
    expect(b.deltaNav).toBe(2);
    expect(b.lines[0]?.delta).toBe(2);
    expect(b.unexplained).toEqual([]);
  });

  it("does not treat a missing prior as zero movement", () => {
    const current = [
      { positionId: "1", companyId: "a", companyName: "Alpha", cost: 10, mark: 14, markAsOf: "2026-09-01" },
    ];
    const b = navBridge("2026-09-01", current, []);
    expect(b.deltaNav).toBeNull();
    expect(b.lines[0]?.delta).toBeNull();
    expect(b.unexplained).toEqual([{ companyName: "Alpha", reason: "no_prior_mark" }]);
  });
});
