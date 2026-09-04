import { describe, expect, it } from "vitest";
import { datedPositionIrr, navBridge, rollupNav } from "./nav.js";

describe("NAV rollup", () => {
  it("keeps MOIC blank when a position is unmarked", () => {
    const r = rollupNav("2026-09-01", [
      { positionId: "1", companyId: "a", companyName: "Alpha", cost: 10, mark: 12, markAsOf: "2026-09-01", sourceRefId: "r1" },
      { positionId: "2", companyId: "b", companyName: "Beta", cost: 4, mark: null, markAsOf: null },
    ]);
    expect(r.moic).toBeNull();
    expect(r.nav.complete).toBe(false);
    expect(r.unmarked.map((u) => u.companyName)).toEqual(["Beta"]);
  });

  it("excludes unprovenanced marks from the headline NAV total", () => {
    const r = rollupNav("2026-09-01", [
      { positionId: "1", companyId: "a", companyName: "Alpha", cost: 10, mark: 12, markAsOf: "2026-09-01", sourceRefId: "r1" },
      { positionId: "2", companyId: "b", companyName: "Beta", cost: 4, mark: 99, markAsOf: "2026-09-01" },
    ]);
    expect(r.nav.total).toBe(12);
    expect(r.nav.complete).toBe(false);
    expect(r.moic).toBeNull();
    expect(r.unprovenanced.map((u) => u.companyName)).toEqual(["Beta"]);
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

  it("matches prior marks by position, not company name", () => {
    const current = [
      { positionId: "p1", companyId: "a", companyName: "Alpha", cost: 10, mark: 14, markAsOf: "2026-09-01" },
      { positionId: "p2", companyId: "a", companyName: "Alpha", cost: 5, mark: 6, markAsOf: "2026-09-01" },
    ];
    const prior = [
      { positionId: "p1", companyId: "a", companyName: "Alpha", cost: 10, mark: 12, markAsOf: "2026-06-01" },
      { positionId: "p2", companyId: "a", companyName: "Alpha", cost: 5, mark: 5, markAsOf: "2026-06-01" },
    ];
    const b = navBridge("2026-09-01", current, prior);
    expect(b.lines).toHaveLength(2);
    expect(b.lines[0]?.delta).toBe(2);
    expect(b.lines[1]?.delta).toBe(1);
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

describe("datedPositionIrr", () => {
  it("returns null when investedAt is missing — never invents a date", () => {
    expect(
      datedPositionIrr({ investedAt: null, cost: 10, mark: 20, markAsOf: "2026-09-01" }),
    ).toBeNull();
  });

  it("computes XIRR when cost date and mark date both exist", () => {
    const r = datedPositionIrr({
      investedAt: "2024-09-01",
      cost: 10,
      mark: 20,
      markAsOf: "2026-09-01",
    });
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0.3);
    expect(r!).toBeLessThan(0.5);
  });
});
