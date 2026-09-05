"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { defaultPriorAsOf, lastCalendarQuarterEnd } from "@venture-os/core";
import { CompanyMark, formatOwnership, PageHead, Panel } from "@/components/BookUI";
import { IconLock, IconWarn } from "@/components/Icons";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";
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
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

function pctIrr(n: number | null | undefined) {
  if (n == null) return "—";
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

export default function NavPage() {
  const { canWrite, canLock } = useBookSession();
  const [data, setData] = useState<(Nav & { period?: Period }) | null>(null);
  const [asOf, setAsOf] = useState(lastCalendarQuarterEnd());
  const [priorAsOf, setPriorAsOf] = useState(defaultPriorAsOf(lastCalendarQuarterEnd()));
  const [fundId, setFundId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [clearMark, setClearMark] = useState(false);
  const [err, setErr] = useState("");
  const [unlockReason, setUnlockReason] = useState("");
  const [lockBusy, setLockBusy] = useState(false);
  const [cos, setCos] = useState<{ id: string; name: string; stage: string | null }[]>([]);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ asOf, priorAsOf });
    if (fundId) p.set("fundId", fundId);
    return p.toString();
  }, [asOf, priorAsOf, fundId]);

  function load() {
    setErr("");
    api<Nav>(`/api/nav?${qs}`)
      .then(setData)
      .catch((e: Error) => setErr(bookErrorMessage(e.message)));
  }
  useEffect(() => {
    load();
  }, [qs]);
  useEffect(() => {
    api<{ companies: { id: string; name: string; stage: string | null }[] }>("/api/companies")
      .then((r) => setCos(r.companies ?? []))
      .catch(() => setCos([]));
  }, []);

  const stageById = useMemo(() => new Map(cos.map((c) => [c.id, c.stage])), [cos]);
  const unmarked = data?.rollup.unmarked ?? [];
  const unprovenanced = data?.rollup.unprovenanced ?? [];
  const unofficial = data?.period?.status !== "locked";

  async function addMark(e: React.FormEvent) {
    e.preventDefault();
    if (form.value === "" && !clearMark) {
      setErr("Enter a mark value, or confirm clear to store a null mark. We will not silently wipe NAV.");
      return;
    }
    const triple = form.fxRate && form.fxDate && form.fxSource;
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
    load();
  }

  return (
    <Shell>
      <PageHead
        title="NAV"
        testId="nav-ready"
        kicker={
          <span className="row" style={{ gap: 8 }}>
            <span className="badge">Institutional book</span>
            <span className={`badge${unofficial ? " status-unofficial" : ""}`}>
              Status: {unofficial ? "unofficial" : "locked"}
            </span>
          </span>
        }
        lede={
          <>
            Quarterly marks · {quarterLabel(asOf)} · as of {asOf}. Deterministic from positions and marks. Missing is —.
            MOIC is blank unless the rollup is complete. IRR appears only when every sourced mark has an{" "}
            <code>investedAt</code>. Dual EUR only with a complete FX triple.
          </>
        }
        actions={
          canLock && unofficial ? (
            <button
              type="button"
              className="btn"
              data-testid="nav-lock"
              disabled={lockBusy}
              onClick={async () => {
                setLockBusy(true);
                setErr("");
                try {
                  await api("/api/nav/lock", { method: "POST", body: JSON.stringify({ asOf }) });
                  load();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Lock failed");
                } finally {
                  setLockBusy(false);
                }
              }}
            >
              <span className="row" style={{ gap: 6 }}>
                <IconLock />
                {lockBusy ? "Locking…" : "Lock marks"}
              </span>
            </button>
          ) : undefined
        }
      />
      <div className="row" style={{ flexWrap: "wrap" }}>
        <label className="field" style={{ maxWidth: 200 }}>
          As-of
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </label>
        <label className="field" style={{ maxWidth: 200 }}>
          Prior as-of
          <input type="date" value={priorAsOf} onChange={(e) => setPriorAsOf(e.target.value)} />
        </label>
        <label className="field" style={{ maxWidth: 220 }}>
          Fund
          <select value={fundId} onChange={(e) => setFundId(e.target.value)} aria-label="Fund">
            <option value="">All funds</option>
            {(data?.funds ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {data?.period && (
        <p className="lede" role="status">
          As-of {asOf} is{" "}
          <strong>{data.period.status === "locked" ? "locked (official)" : "unofficial"}</strong>
          {data.period.snapshotSha256
            ? ` · pack frozen ${data.period.snapshotSha256.slice(0, 12)}…`
            : ""}
          {data.period.unlockReason ? ` · last unlock: ${data.period.unlockReason}` : ""}.
        </p>
      )}
      {canLock && (
        <div className="row" style={{ marginBottom: 12 }}>
          {data?.period?.status === "locked" && (
            <>
              <label className="field" style={{ maxWidth: 320 }}>
                Unlock reason
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
                  setErr("");
                  try {
                    await api("/api/nav/unlock", {
                      method: "POST",
                      body: JSON.stringify({ asOf, reason: unlockReason }),
                    });
                    setUnlockReason("");
                    load();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Unlock failed");
                  } finally {
                    setLockBusy(false);
                  }
                }}
              >
                Unlock
              </button>
            </>
          )}
          {data?.period?.snapshotSha256 && (
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
                  setErr(e instanceof Error ? e.message : "Snapshot missing");
                }
              }}
            >
              Download official pack
            </button>
          )}
        </div>
      )}
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {!data && !err && <p className="lede">Loading the book…</p>}
      {data && (
        <>
          <div className="notice-split">
            <div className="notice">
              <strong>Unmarked companies: {unmarked.length}</strong>
              <p className="lede">
                {unmarked.length === 0
                  ? "Every position on this as-of has a mark — or there are no positions yet."
                  : "Needs a booked mark. We will not invent a figure."}{" "}
                {unmarked.map((u) => (
                  <button
                    key={`${u.companyName}-${u.positionId ?? ""}`}
                    type="button"
                    className="chip"
                    onClick={() => u.positionId && setForm({ ...emptyForm, positionId: u.positionId })}
                  >
                    {u.companyName}
                  </button>
                ))}
              </p>
            </div>
            <div className={`notice${unprovenanced.length ? " warn" : ""}`}>
              <strong>Unprovenanced figures: {unprovenanced.length}</strong>
              <p className="lede">
                {unprovenanced.length === 0
                  ? "No cited-less marks on this as-of."
                  : "Missing citations. Headline NAV excludes them — attach a memo to include."}{" "}
                {unprovenanced.map((u) => u.companyName).join(", ")}
              </p>
            </div>
          </div>
          <div className="cards cards-4">
            <div className="kpi">
              <div className="k">Cost</div>
              <div className="v">{inr(data.rollup.cost.total)}</div>
              {!data.rollup.cost.complete && <div className="meta">Incomplete</div>}
            </div>
            <div className={`kpi${!data.rollup.nav.complete ? " accent-warn" : " accent-forest"}`}>
              <div className="k">NAV</div>
              <div className="v">{inr(data.rollup.nav.total)}</div>
              <div className="meta">
                {data.eur?.conversionRefused
                  ? "EUR — (no FX triple)"
                  : data.eur?.total != null
                    ? `EUR ${data.eur.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                    : "EUR —"}
                {!data.rollup.nav.complete ? ` · incomplete · ${data.rollup.nav.missing} missing` : ""}
              </div>
            </div>
            <div className="kpi">
              <div className="k">MOIC</div>
              <div className="v">{data.rollup.moic == null ? "—" : `${data.rollup.moic.toFixed(2)}x`}</div>
            </div>
            <div className="kpi">
              <div className="k">IRR</div>
              <div className="v">{pctIrr(data.irr)}</div>
              {data.irr == null && <div className="meta">Needs investedAt on every sourced mark</div>}
            </div>
          </div>
          <p className="lede" style={{ marginTop: -8, marginBottom: 16 }}>
            Bridge Δ {data.bridge.deltaNav == null ? "—" : inr(data.bridge.deltaNav)} vs {data.priorAsOf}.
          </p>
        </>
      )}
      {data && data.positions.length === 0 && (
        <div className="empty">
          No positions on the book. Add a fund in <Link href="/settings">Settings</Link>, then onboard a company.
        </div>
      )}
      {data && data.positions.length > 0 && (
        <>
          {data.bridge.unexplained.length > 0 && (
            <p className="lede">
              Unexplained bridge:{" "}
              {data.bridge.unexplained.map((u) => `${u.companyName} (${u.reason.replaceAll("_", " ")})`).join(", ")}
            </p>
          )}
          {data.bridge.lines.length > 0 && (
            <>
              <Panel title="Period bridge" flush>
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Prior</th>
                    <th>Prior as-of</th>
                    <th>Current</th>
                    <th>Current as-of</th>
                    <th>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bridge.lines.map((l) => (
                    <tr key={`${l.companyName}-${l.currentAsOf}`}>
                      <td>{l.companyName}</td>
                      <td>{l.priorMark == null ? "—" : inr(l.priorMark)}</td>
                      <td>{l.priorAsOf ?? "—"}</td>
                      <td>{l.currentMark == null ? "—" : inr(l.currentMark)}</td>
                      <td>{l.currentAsOf ?? "—"}</td>
                      <td>{l.delta == null ? "—" : inr(l.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </Panel>
            </>
          )}
          <Panel title="Company marks" flush>
          <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Stage</th>
                <th>Cost</th>
                <th>NAV</th>
                <th>MOIC</th>
                <th>IRR</th>
                <th>Mark date</th>
                <th>Provenance</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((p) => {
                const unmarkedRow = p.mark == null;
                const moic = positionMoic(p.mark, p.cost);
                return (
                  <tr key={p.position.id}>
                    <td>
                      <div className="company-cell">
                        {unmarkedRow ? <IconWarn className="nav-ico look-ico" /> : <CompanyMark name={p.companyName} />}
                        <div>
                          {p.position.companyId ? (
                            <Link className="company-link" href={`/companies/${p.position.companyId}`}>
                              {p.companyName}
                            </Link>
                          ) : (
                            p.companyName
                          )}
                          <div className="lede">{p.fundName} · {formatOwnership(p.position.ownershipPct)}</div>
                        </div>
                      </div>
                    </td>
                    <td>{stageById.get(p.position.companyId ?? "") ?? "—"}</td>
                    <td className="num">{p.cost == null ? "—" : inr(p.cost)}</td>
                    <td>
                      <Fact
                        display={p.markDisplay?.display ?? (p.mark == null ? "—" : inr(p.mark))}
                        isFact={Boolean(p.sourceRefId && p.mark != null)}
                        note={p.markDisplay?.fxNote ?? null}
                        sourcePath={sourcePathFor(data.sourceRefs, p.sourceRefId)}
                      />
                    </td>
                    <td className="num">{moic == null ? "—" : `${moic.toFixed(2)}x`}</td>
                    <td className="num">{pctIrr(p.irr)}</td>
                    <td className="num">{p.markAsOf ?? "—"}</td>
                    <td>
                      {p.sourceRefId ? (
                        <Fact display="Cite" isFact sourcePath={sourcePathFor(data.sourceRefs, p.sourceRefId)} />
                      ) : (
                        <span className="badge">{unmarkedRow ? "Pending" : "—"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </Panel>
          {canWrite && data.period?.status === "locked" && (
            <p className="lede">This as-of is locked. Unlock with a reason before changing marks.</p>
          )}
          {canWrite && data.period?.status !== "locked" && (
            <form onSubmit={addMark} className="row" style={{ marginTop: 16, flexWrap: "wrap" }}>
              <select value={form.positionId} onChange={(e) => setForm({ ...form, positionId: e.target.value })} required>
                <option value="">Position</option>
                {data.positions.map((p) => (
                  <option key={p.position.id} value={p.position.id}>
                    {p.fundName} · {p.companyName}
                  </option>
                ))}
              </select>
              <input
                placeholder="Mark value"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
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
              <input
                placeholder="Rationale"
                value={form.rationale}
                onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              />
              <input
                placeholder="FX rate"
                value={form.fxRate}
                onChange={(e) => setForm({ ...form, fxRate: e.target.value })}
                aria-label="FX rate"
              />
              <input
                type="date"
                value={form.fxDate}
                onChange={(e) => setForm({ ...form, fxDate: e.target.value })}
                aria-label="FX date"
              />
              <input
                placeholder="FX source"
                value={form.fxSource}
                onChange={(e) => setForm({ ...form, fxSource: e.target.value })}
                aria-label="FX source"
              />
              <select
                value={form.documentId}
                onChange={(e) => setForm({ ...form, documentId: e.target.value })}
                aria-label="Mark memo"
              >
                <option value="">Memo (optional — chip stays — without a file)</option>
                {(data.documents ?? [])
                  .filter((d) => {
                    const pos = data.positions.find((p) => p.position.id === form.positionId);
                    return !pos?.position.companyId || d.companyId === pos.position.companyId;
                  })
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename} ({d.kind.replaceAll("_", " ")})
                    </option>
                  ))}
              </select>
              <label className="lede">
                <input type="checkbox" checked={clearMark} onChange={(e) => setClearMark(e.target.checked)} /> Confirm
                clear (null mark)
              </label>
              <button className="btn sm">Add mark</button>
            </form>
          )}
          {canWrite && (
            <p className="lede">EUR conversion is stored only when rate, date, and source are all set. Incomplete triples are refused, not invented.</p>
          )}
        </>
      )}
    </Shell>
  );
}