"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { defaultPriorAsOf, lastCalendarQuarterEnd } from "@venture-os/core";
import { CompanyMark, formatOwnership, PageHead, Panel, WorkSplit } from "@/components/BookUI";
import { NavPeriodAreaChart, RankTracks } from "@/components/BookCharts";
import { IconLock, IconWarn } from "@/components/Icons";
import { Fact, useBookSession } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";
import { bookFetcher } from "@/lib/book-data";
import { bookErrorMessage } from "@/lib/wake";

type Nav = {
  asOf: string;
  priorAsOf: string;
  irr?: number | null;
  funds?: { id: string; name: string; currency: string }[];
  rollup: {
    nav: { total: number | null; complete: boolean; missing: number };
    cost: { total: number | null; complete: boolean };
    moic: number | null;
    unmarked: { companyName: string; positionId?: string }[];
    unprovenanced?: { companyName: string }[];
  };
  bridge: {
    deltaNav: number | null;
    unexplained: { companyName: string; reason: string }[];
    lines: {
      companyName: string;
      priorMark: number | null;
      currentMark: number | null;
      delta: number | null;
      priorAsOf: string | null;
      currentAsOf: string | null;
    }[];
  };
  positions: {
    position: { id: string; companyId?: string; costBasis: number | null; ownershipPct: number | null };
    companyName: string;
    fundName: string;
    cost: number | null;
    mark: number | null;
    markAsOf: string | null;
    method: string | null;
    rationale?: string | null;
    irr?: number | null;
    sourceRefId: string | null;
    priorMark: number | null;
    priorMarkAsOf: string | null;
    fxRate?: number | null;
    fxDate?: string | null;
    fxSource?: string | null;
    valueEur?: number | null;
    markDisplay?: Dual;
  }[];
  eur?: { total: number | null; conversionRefused: boolean; fxNote: string | null };
  sourceRefs?: { id: string; documentId: string }[];
  documents?: { id: string; filename: string; kind: string; companyId: string | null }[];
};

const emptyForm = {
  positionId: "",
  value: "",
  method: "last_round",
  rationale: "",
  fxRate: "",
  fxDate: "",
  fxSource: "",
  documentId: "",
};

const MARK_METHODS = [
  { value: "last_round", label: "Last round" },
  { value: "dcf", label: "DCF" },
  { value: "bid", label: "Bid" },
  { value: "write_down", label: "Write-down" },
  { value: "other", label: "Other" },
];

function inr(n: number | null | undefined) {
  if (n == null) return "";
  return n.toLocaleString("en-IN");
}

function pctIrr(n: number | null | undefined) {
  if (n == null) return "";
  return `${(n * 100).toFixed(1)}%`;
}

function quarterLabel(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return `Q${Math.ceil(m / 3)} ${y}`;
}

function positionMoic(mark: number | null, cost: number | null) {
  if (mark == null || cost == null || cost === 0) return null;
  return mark / cost;
}

type Dual = {
  display: string;
  isFact: boolean;
  converted?: string;
  conversionRefused?: boolean;
  fxNote?: string | null;
  sourceRefId?: string | null;
};

type Period = {
  status: "unofficial" | "locked";
  lockedBy?: string | null;
  lockedAt?: string | null;
  unlockReason?: string | null;
  snapshotSha256?: string | null;
  snapshotKey?: string | null;
  snapshotAt?: string | null;
};

type RowFilter = "all" | "unmarked" | "changed";

export default function NavPage() {
  const { canWrite, canLock } = useBookSession();
  const [asOf, setAsOf] = useState(lastCalendarQuarterEnd());
  const [priorAsOf, setPriorAsOf] = useState(defaultPriorAsOf(lastCalendarQuarterEnd()));
  const [fundId, setFundId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [clearMark, setClearMark] = useState(false);
  const [showFx, setShowFx] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [actionErr, setActionErr] = useState("");
  const [markMsg, setMarkMsg] = useState("");
  const [unlockReason, setUnlockReason] = useState("");
  const [lockBusy, setLockBusy] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ asOf, priorAsOf });
    if (fundId) p.set("fundId", fundId);
    return p.toString();
  }, [asOf, priorAsOf, fundId]);

  const { data, error, mutate } = useSWR<(Nav & { period?: Period }) | null>(`/api/nav?${qs}`, bookFetcher);
  const err = actionErr || (error ? bookErrorMessage(error instanceof Error ? error.message : String(error)) : "");

  function load() {
    setActionErr("");
    void mutate();
  }

  const unmarked = data?.rollup.unmarked ?? [];
  const unprovenanced = data?.rollup.unprovenanced ?? [];
  const unofficial = data?.period?.status !== "locked";
  const locked = data?.period?.status === "locked";

  const bridgeByCompany = useMemo(() => {
    const m = new Map<string, Nav["bridge"]["lines"][number]>();
    for (const line of data?.bridge.lines ?? []) m.set(line.companyName, line);
    return m;
  }, [data?.bridge.lines]);

  const visiblePositions = useMemo(() => {
    const rows = data?.positions ?? [];
    if (rowFilter === "unmarked") return rows.filter((p) => p.mark == null);
    if (rowFilter === "changed") {
      return rows.filter((p) => {
        const b = bridgeByCompany.get(p.companyName);
        return b?.delta != null && b.delta !== 0;
      });
    }
    return rows;
  }, [data?.positions, rowFilter, bridgeByCompany]);

  const positionOptions = useMemo(() => {
    const rows = data?.positions ?? [];
    const unmarkedIds = new Set(unmarked.map((u) => u.positionId).filter(Boolean));
    const pending = rows.filter((p) => unmarkedIds.has(p.position.id) || p.mark == null);
    const rest = rows.filter((p) => !pending.includes(p));
    return [...pending, ...rest];
  }, [data?.positions, unmarked]);

  async function addMark(e: React.FormEvent) {
    e.preventDefault();
    if (form.value === "" && !clearMark) {
      setActionErr("Enter a mark value, or confirm clear to store a null mark.");
      return;
    }
    const triple = form.fxRate && form.fxDate && form.fxSource;
    setActionErr("");
    setMarkMsg("");
    try {
      await api("/api/nav/marks", {
        method: "POST",
        body: JSON.stringify({
          positionId: form.positionId,
          asOf,
          method: form.method,
          value: form.value === "" ? null : Number(form.value),
          rationale: form.rationale,
          fxRate: triple ? Number(form.fxRate) : undefined,
          fxDate: triple ? form.fxDate : undefined,
          fxSource: triple ? form.fxSource : undefined,
          documentId: form.documentId || undefined,
        }),
      });
      setForm(emptyForm);
      setClearMark(false);
      setShowFx(false);
      setMarkMsg(clearMark ? "Mark cleared" : "Mark saved");
      load();
    } catch (ex) {
      setActionErr(ex instanceof Error ? ex.message : "Could not save mark");
    }
  }

  function pickUnmarked(positionId: string) {
    if (!positionId) return;
    setForm({ ...emptyForm, positionId });
    setRowFilter("unmarked");
    document.getElementById("nav-mark-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <>
      <PageHead
        title="NAV"
        testId="nav-ready"
        kicker={`${quarterLabel(asOf)} · ${unofficial ? "Unofficial" : "Locked"}`}
        actions={
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {canLock && unofficial ? (
              <button
                type="button"
                className="btn"
                data-testid="nav-lock"
                disabled={lockBusy}
                onClick={() => {
                  setShowUnlock(false);
                  setShowLockConfirm(true);
                }}
              >
                <span className="row" style={{ gap: 6 }}>
                  <IconLock />
                  Lock
                </span>
              </button>
            ) : null}
            {canLock && locked ? (
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => {
                  setShowLockConfirm(false);
                  setShowUnlock((v) => !v);
                }}
              >
                Unlock…
              </button>
            ) : null}
            {canLock && data?.period?.snapshotSha256 ? (
              <button
                type="button"
                className="btn ghost sm"
                data-testid="nav-snapshot"
                onClick={async () => {
                  try {
                    const pack = await api<{ snapshot: { asOf: string } }>(`/api/nav/snapshot?asOf=${asOf}`);
                    const blob = new Blob([JSON.stringify(pack.snapshot, null, 2)], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `nav-pack-${asOf}.json`;
                    a.click();
                  } catch (e) {
                    setActionErr(e instanceof Error ? e.message : "Snapshot missing");
                  }
                }}
              >
                Pack
              </button>
            ) : null}
          </div>
        }
      />

      <div className="table-tools nav-period-bar">
        <label className="field table-tools-field">
          <span>As of</span>
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} aria-label="As of" />
        </label>
        <label className="field table-tools-field">
          <span>Prior</span>
          <input
            type="date"
            value={priorAsOf}
            onChange={(e) => setPriorAsOf(e.target.value)}
            aria-label="Prior as of"
          />
        </label>
        <label className="field table-tools-field">
          <span className="sr-only">Fund</span>
          <select value={fundId} onChange={(e) => setFundId(e.target.value)} aria-label="Fund">
            <option value="">All funds</option>
            {(data?.funds ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field table-tools-field">
          <span className="sr-only">Show</span>
          <select
            value={rowFilter}
            onChange={(e) => setRowFilter(e.target.value as RowFilter)}
            aria-label="Filter marks"
          >
            <option value="all">All positions</option>
            <option value="unmarked">Unmarked only</option>
            <option value="changed">Changed only</option>
          </select>
        </label>
      </div>

      {canLock && unofficial && showLockConfirm ? (
        <div className="nav-unlock-bar" role="alertdialog" aria-label="Confirm lock">
          <p className="lede" style={{ margin: 0, flex: "1 1 220px" }}>
            Lock {quarterLabel(asOf)}? Marks cannot change until someone unlocks.
          </p>
          <button
            type="button"
            className="btn sm"
            data-testid="nav-lock-confirm"
            disabled={lockBusy}
            onClick={async () => {
              setLockBusy(true);
              setActionErr("");
              try {
                await api("/api/nav/lock", { method: "POST", body: JSON.stringify({ asOf }) });
                setShowLockConfirm(false);
                load();
              } catch (e) {
                setActionErr(e instanceof Error ? e.message : "Lock failed");
              } finally {
                setLockBusy(false);
              }
            }}
          >
            {lockBusy ? "Locking…" : "Confirm lock"}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            disabled={lockBusy}
            onClick={() => setShowLockConfirm(false)}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {canLock && locked && showUnlock ? (
        <div className="nav-unlock-bar">
          <label className="field" style={{ flex: "1 1 240px", margin: 0 }}>
            <span className="sr-only">Unlock reason</span>
            <input
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="Why reopen this quarter?"
              required
            />
          </label>
          <button
            type="button"
            className="btn ghost sm"
            data-testid="nav-unlock"
            disabled={lockBusy || unlockReason.trim().length < 3}
            onClick={async () => {
              setLockBusy(true);
              setActionErr("");
              try {
                await api("/api/nav/unlock", {
                  method: "POST",
                  body: JSON.stringify({ asOf, reason: unlockReason }),
                });
                setUnlockReason("");
                setShowUnlock(false);
                load();
              } catch (e) {
                setActionErr(e instanceof Error ? e.message : "Unlock failed");
              } finally {
                setLockBusy(false);
              }
            }}
          >
            Confirm unlock
          </button>
        </div>
      ) : null}

      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {!data && !err && <p className="lede">Loading…</p>}

      {data ? (
        <>
          <div className="cards cards-4">
            <div className="kpi">
              <div className="k">Cost</div>
              <div className="v">{inr(data.rollup.cost.total)}</div>
              {!data.rollup.cost.complete ? <div className="meta">Incomplete</div> : null}
            </div>
            <div className={`kpi${!data.rollup.nav.complete ? " accent-warn" : " accent-forest"}`}>
              <div className="k">NAV</div>
              <div className="v">{inr(data.rollup.nav.total)}</div>
              <div className="meta">
                {[
                  data.eur?.total != null
                    ? `EUR ${data.eur.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                    : null,
                  !data.rollup.nav.complete ? `${data.rollup.nav.missing} missing` : null,
                  data.bridge.deltaNav != null ? `vs prior ${inr(data.bridge.deltaNav)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || null}
              </div>
            </div>
            <div className="kpi">
              <div className="k">MOIC</div>
              <div className="v">{data.rollup.moic == null ? "" : `${data.rollup.moic.toFixed(2)}x`}</div>
            </div>
            <div className="kpi">
              <div className="k">IRR</div>
              <div className="v">{pctIrr(data.irr)}</div>
            </div>
          </div>

          {(() => {
            const priorTotal =
              data.rollup.nav.total != null && data.bridge.deltaNav != null
                ? data.rollup.nav.total - data.bridge.deltaNav
                : null;
            const movers = [...data.bridge.lines]
              .filter((l): l is typeof l & { delta: number } => l.delta != null && l.delta !== 0)
              .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
              .slice(0, 8)
              .map((l) => {
                const href = data.positions.find((p) => p.companyName === l.companyName)?.position.companyId;
                return {
                  id: l.companyName,
                  name: l.companyName,
                  href: href ? `/companies/${href}` : undefined,
                  value: Math.abs(l.delta),
                  display: `${l.delta > 0 ? "+" : ""}${inr(l.delta)}`,
                  tone: l.delta > 0 ? ("up" as const) : ("down" as const),
                };
              });
            const movement = (
              <Panel title="Value movement" kicker="Booked marks only">
                <RankTracks series="nav" empty="No mark movement vs prior." rows={movers} />
              </Panel>
            );
            if (priorTotal == null || data.rollup.nav.total == null) return movement;
            return (
              <WorkSplit>
                <Panel title="NAV over time" kicker={`${quarterLabel(priorAsOf)} → ${quarterLabel(asOf)}`}>
                  <NavPeriodAreaChart
                    priorLabel={quarterLabel(priorAsOf)}
                    currentLabel={quarterLabel(asOf)}
                    priorTotal={priorTotal}
                    currentTotal={data.rollup.nav.total}
                  />
                </Panel>
                {movement}
              </WorkSplit>
            );
          })()}

          {(unmarked.length > 0 || unprovenanced.length > 0) && (
            <div className="nav-attention">
              {unmarked.length > 0 ? (
                <label className="field nav-attention-field">
                  <span className="page-kicker">Unmarked · {unmarked.length}</span>
                  <select
                    defaultValue=""
                    aria-label="Pick unmarked company"
                    onChange={(e) => {
                      pickUnmarked(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Select company to mark…</option>
                    {unmarked.map((u) => (
                      <option key={`${u.companyName}-${u.positionId ?? ""}`} value={u.positionId ?? ""}>
                        {u.companyName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="lede" style={{ margin: 0 }}>
                  All positions marked for this as-of.
                </p>
              )}
              {unprovenanced.length > 0 ? (
                <p className="lede" style={{ margin: 0 }}>
                  No citation · {unprovenanced.length} excluded from headline NAV
                </p>
              ) : null}
            </div>
          )}

          {data.bridge.unexplained.length > 0 ? (
            <p className="lede">
              Unexplained bridge:{" "}
              {data.bridge.unexplained.map((u) => `${u.companyName} (${u.reason.replaceAll("_", " ")})`).join(", ")}
            </p>
          ) : null}

          {data.positions.length === 0 ? (
            <div className="empty">
              No positions. Add a fund in <Link href="/settings">Settings</Link>, then onboard a company.
            </div>
          ) : (
            <div className="nav-workspace">
            <Panel
              title="Marks"
              kicker={`${visiblePositions.length} of ${data.positions.length}`}
              flush
            >
              <div className="table-scroll">
                <table className="table-hover">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Cost</th>
                      <th>Mark</th>
                      <th>Δ</th>
                      <th>MOIC</th>
                      <th>As-of</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePositions.map((p) => {
                      const unmarkedRow = p.mark == null;
                      const moic = positionMoic(p.mark, p.cost);
                      const bridge = bridgeByCompany.get(p.companyName);
                      return (
                        <tr
                          key={p.position.id}
                          className={unmarkedRow ? "row-flag" : undefined}
                          onClick={() => {
                            if (!(canWrite && !locked)) return;
                            setForm({ ...emptyForm, positionId: p.position.id });
                            const el = document.getElementById("nav-mark-form");
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                          }}
                          style={canWrite && !locked ? { cursor: "pointer" } : undefined}
                        >
                          <td>
                            <div className="company-cell">
                              {unmarkedRow ? (
                                <IconWarn className="nav-ico look-ico" />
                              ) : (
                                <CompanyMark name={p.companyName} />
                              )}
                              <div>
                                {p.position.companyId ? (
                                  <Link
                                    className="company-link"
                                    href={`/companies/${p.position.companyId}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {p.companyName}
                                  </Link>
                                ) : (
                                  p.companyName
                                )}
                                <div className="lede">
                                  {p.fundName} · {formatOwnership(p.position.ownershipPct)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="num">{p.cost == null ? "" : inr(p.cost)}</td>
                          <td>
                            <Fact
                              display={p.markDisplay?.display ?? (p.mark == null ? "" : inr(p.mark))}
                              isFact={Boolean(p.sourceRefId && p.mark != null)}
                              note={p.markDisplay?.fxNote ?? null}
                              sourcePath={sourcePathFor(data.sourceRefs, p.sourceRefId)}
                            />
                          </td>
                          <td className="num">{bridge?.delta == null ? "" : inr(bridge.delta)}</td>
                          <td className="num">{moic == null ? "" : `${moic.toFixed(2)}x`}</td>
                          <td className="num">{p.markAsOf ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visiblePositions.length === 0 ? (
                <p className="table-foot">No rows match this filter.</p>
              ) : null}
            </Panel>

          {canWrite && locked ? (
            <p className="lede">Locked. Unlock before changing marks.</p>
          ) : null}

          {canWrite && !locked && data.positions.length > 0 ? (
            <Panel id="nav-mark-form" title="Mark this quarter" kicker={quarterLabel(asOf)}>
              <form onSubmit={addMark} className="nav-mark-form">
                <label className="field">
                  Company
                  <select
                    value={form.positionId}
                    onChange={(e) => setForm({ ...form, positionId: e.target.value })}
                    required
                  >
                    <option value="">Select position…</option>
                    {positionOptions.map((p) => (
                      <option key={p.position.id} value={p.position.id}>
                        {p.mark == null ? "○ " : ""}
                        {p.companyName}
                        {p.fundName ? ` · ${p.fundName}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Value
                  <input
                    placeholder="Mark value"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    disabled={clearMark}
                  />
                </label>
                <label className="field">
                  Method
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    aria-label="Mark method"
                  >
                    {MARK_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Rationale
                  <input
                    placeholder="Short rationale"
                    value={form.rationale}
                    onChange={(e) => setForm({ ...form, rationale: e.target.value })}
                  />
                </label>
                <label className="field">
                  Memo
                  <select
                    value={form.documentId}
                    onChange={(e) => setForm({ ...form, documentId: e.target.value })}
                    aria-label="Mark memo"
                  >
                    <option value="">Optional source file</option>
                    {(data.documents ?? [])
                      .filter((d) => {
                        const pos = data.positions.find((p) => p.position.id === form.positionId);
                        return !pos?.position.companyId || d.companyId === pos.position.companyId;
                      })
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.filename}
                        </option>
                      ))}
                  </select>
                </label>

                <div className="nav-mark-extras">
                  <button type="button" className="linkish" onClick={() => setShowFx((v) => !v)}>
                    {showFx ? "Hide FX" : "FX conversion (optional)"}
                  </button>
                  <label className="lede" style={{ margin: 0 }}>
                    <input type="checkbox" checked={clearMark} onChange={(e) => setClearMark(e.target.checked)} />{" "}
                    Clear mark
                  </label>
                </div>

                {showFx ? (
                  <div className="nav-mark-fx">
                    <label className="field">
                      Rate
                      <input
                        placeholder="FX rate"
                        value={form.fxRate}
                        onChange={(e) => setForm({ ...form, fxRate: e.target.value })}
                        aria-label="FX rate"
                      />
                    </label>
                    <label className="field">
                      Date
                      <input
                        type="date"
                        value={form.fxDate}
                        onChange={(e) => setForm({ ...form, fxDate: e.target.value })}
                        aria-label="FX date"
                      />
                    </label>
                    <label className="field">
                      Source
                      <input
                        placeholder="e.g. RBI"
                        value={form.fxSource}
                        onChange={(e) => setForm({ ...form, fxSource: e.target.value })}
                        aria-label="FX source"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="nav-mark-actions">
                  {markMsg ? (
                    <p className="lede" role="status" style={{ margin: 0, marginRight: "auto" }}>
                      {markMsg}
                    </p>
                  ) : null}
                  <button className="btn" type="submit">
                    Save mark
                  </button>
                </div>
              </form>
            </Panel>
          ) : null}
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
