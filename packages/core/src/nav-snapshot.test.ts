import { describe, expect, it } from "vitest";
import { rollupNav } from "./nav.js";
import { buildNavPackSnapshot, hashNavPackSnapshot, rollupEur } from "./nav-snapshot.js";

describe("rollupEur", () => {
  it("refuses a headline when any sourced mark lacks a complete FX triple", () => {
    const r = rollupEur([
      {
        mark: 12,
        sourceRefId: "a",
        valueEur: 0.13,
        fxRate: 0.011,
        fxDate: "2026-06-30",
        fxSource: "RBI",
      },
      { mark: 8, sourceRefId: "b", valueEur: null, fxRate: null, fxDate: null, fxSource: null },
    ]);
    expect(r.total).toBeNull();
    expect(r.conversionRefused).toBe(true);
    expect(r.fxNote).toBe("EUR — (no FX triple)");
  });

  it("sums EUR only when every sourced mark has a triple", () => {
    const r = rollupEur([
      {
        mark: 12,
        sourceRefId: "a",
        valueEur: 0.13,
        fxRate: 0.011,
        fxDate: "2026-06-30",
        fxSource: "RBI",
      },
      {
        mark: 8,
        sourceRefId: "b",
        valueEur: 0.09,
        fxRate: 0.011,
        fxDate: "2026-06-30",
        fxSource: "RBI",
      },
    ]);
    expect(r.total).toBeCloseTo(0.22);
    expect(r.conversionRefused).toBe(false);
  });

  it("does not treat unmarked rows as a refuse", () => {
    const r = rollupEur([{ mark: null, sourceRefId: null }]);
    expect(r.conversionRefused).toBe(false);
    expect(r.total).toBeNull();
  });
});

describe("NAV pack snapshot", () => {
  it("freezes rollup unmarked names and does not invent a NAV total", () => {
    const rollup = rollupNav("2026-06-30", [
      {
        positionId: "1",
        companyId: "a",
        companyName: "Alpha",
        cost: 10,
        mark: 12,
        markAsOf: "2026-06-30",
        sourceRefId: "r1",
      },
      { positionId: "2", companyId: "b", companyName: "Beta", cost: 4, mark: null, markAsOf: null },
    ]);
    const pack = buildNavPackSnapshot({
      asOf: "2026-06-30",
      lockedAt: "2026-09-05T00:00:00.000Z",
      lockedBy: "user-1",
      rollup,
      positions: [
        {
          positionId: "1",
          companyName: "Alpha",
          cost: 10,
          mark: 12,
          markAsOf: "2026-06-30",
          sourceRefId: "r1",
          currency: "INR",
          fxRate: null,
          fxDate: null,
          fxSource: null,
          valueEur: null,
        },
        {
          positionId: "2",
          companyName: "Beta",
          cost: 4,
          mark: null,
          markAsOf: null,
          sourceRefId: null,
          currency: "INR",
          fxRate: null,
          fxDate: null,
          fxSource: null,
          valueEur: null,
        },
      ],
    });
    expect(pack.kind).toBe("nav_period_pack");
    expect(pack.version).toBe(1);
    expect(pack.rollup.moic).toBeNull();
    expect(pack.rollup.unmarked.map((u) => u.companyName)).toEqual(["Beta"]);
    expect(pack.eur.conversionRefused).toBe(true);
    expect(hashNavPackSnapshot(pack)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashNavPackSnapshot(pack)).toBe(hashNavPackSnapshot(pack));
  });
});
