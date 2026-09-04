"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { defaultPriorAsOf, lastCalendarQuarterEnd } from "@venture-os/core";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";

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
  }[];
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

export default function NavPage() {
  const { canWrite } = useBookSession();
  const [data, setData] = useState<Nav | null>(null);
  const [asOf, setAsOf] = useState(lastCalendarQuarterEnd());
  const [priorAsOf, setPriorAsOf] = useState(defaultPriorAsOf(lastCalendarQuarterEnd()));
  const [fundId, setFundId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [clearMark, setClearMark] = useState(false);
  const [err, setErr] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams({ asOf, priorAsOf });
    if (fundId) p.set("fundId", fundId);
    return p.toString();
  }, [asOf, priorAsOf, fundId]);

  function load() {
    setErr("");
    api<Nav>(`/api/nav?${qs}`)
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }
  useEffect(() => {
    load();
  }, [qs]);

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
      <h1>NAV</h1>
      <p className="lede">
        Deterministic from positions and marks. A total that skips unmarked names says so. MOIC is blank unless the
        rollup is complete. IRR appears only when every sourced mark has an <code>investedAt</code> — we never invent
        an investment date. The bridge is period-over-period from booked marks. Dual EUR only with a complete FX
        triple. Approval / period lock is later.
      </p>
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
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {data && data.positions.length === 0 && (
        <div className="empty">
          No positions on the book. Add a fund in <Link href="/settings">Settings</Link>, then onboard a company.
        </div>
      )}
      {data && data.positions.length > 0 && (
        <>
          <div className="cards">
            <div className="card">
              <div className="k">Cost</div>
              <div className="v">{inr(data.rollup.cost.total)}</div>
              {!data.rollup.cost.complete && <div className="lede">Incomplete</div>}
            </div>
            <div className="card">
              <div className="k">NAV</div>
              <div className="v">{inr(data.rollup.nav.total)}</div>
              {!data.rollup.nav.complete && (
                <div className="lede">Incomplete · {data.rollup.nav.missing} missing</div>
              )}
            </div>
            <div className="card">
              <div className="k">MOIC</div>
              <div className="v">{data.rollup.moic == null ? "—" : `${data.rollup.moic.toFixed(2)}x`}</div>
            </div>
            <div className="card">
              <div className="k">IRR</div>
              <div className="v">{pctIrr(data.irr)}</div>
              {data.irr == null && <div className="lede">Needs investedAt on every sourced mark</div>}
            </div>
            <div className="card">
              <div className="k">Bridge Δ</div>
              <div className="v">{data.bridge.deltaNav == null ? "—" : inr(data.bridge.deltaNav)}</div>
              <div className="lede">vs {data.priorAsOf}</div>
            </div>
          </div>
          {data.rollup.unmarked.length > 0 && (
            <p className="lede">
              Unmarked:{" "}
              {data.rollup.unmarked.map((u) => (
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
          )}
          {(data.rollup.unprovenanced ?? []).length > 0 && (
            <p className="lede">
              Unprovenanced marks (excluded from headline NAV):{" "}
              {data.rollup.unprovenanced!.map((u) => u.companyName).join(", ")}. Attach a memo to include them.
            </p>
          )}
          {data.bridge.unexplained.length > 0 && (
            <p className="lede">
              Unexplained bridge:{" "}
              {data.bridge.unexplained.map((u) => `${u.companyName} (${u.reason.replaceAll("_", " ")})`).join(", ")}
            </p>
          )}
          {data.bridge.lines.length > 0 && (
            <>
              <h2>Period bridge</h2>
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
            </>
          )}
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Fund</th>
                <th>Ownership</th>
                <th>Cost</th>
                <th>Mark</th>
                <th>As-of</th>
                <th>Method</th>
                <th>IRR</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((p) => (
                <tr key={p.position.id}>
                  <td>{p.companyName}</td>
                  <td>{p.fundName}</td>
                  <td>{p.position.ownershipPct == null ? "—" : `${p.position.ownershipPct}%`}</td>
                  <td>{p.cost == null ? "—" : inr(p.cost)}</td>
                  <td>
                    <Fact
                      display={p.mark == null ? "—" : inr(p.mark)}
                      isFact={Boolean(p.sourceRefId && p.mark != null)}
                      sourcePath={sourcePathFor(data.sourceRefs, p.sourceRefId)}
                    />
                  </td>
                  <td>{p.markAsOf ?? "—"}</td>
                  <td>{p.method ?? "—"}</td>
                  <td>{pctIrr(p.irr)}</td>
                  <td className="lede">{p.rationale || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {canWrite && (
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