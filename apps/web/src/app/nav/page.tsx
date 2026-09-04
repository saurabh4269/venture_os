"use client";

import { useEffect, useState } from "react";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";

type Nav = {
  asOf: string;
  priorAsOf: string;
  rollup: {
    nav: { total: number | null; complete: boolean; missing: number };
    cost: { total: number | null; complete: boolean };
    moic: number | null;
    unmarked: { companyName: string }[];
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

export default function NavPage() {
  const { canWrite } = useBookSession();
  const [data, setData] = useState<Nav | null>(null);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState(emptyForm);

  function load() {
    api<Nav>(`/api/nav?asOf=${asOf}`).then(setData);
  }
  useEffect(() => {
    load();
  }, [asOf]);

  async function addMark(e: React.FormEvent) {
    e.preventDefault();
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
    load();
  }

  return (
    <Shell>
      <h1>NAV</h1>
      <p className="lede">
        Deterministic from positions and marks. A total that skips unmarked names says so. MOIC is blank unless the
        rollup is complete. The bridge is period-over-period from booked marks — missing priors stay unexplained, never
        zero-filled. Dual EUR only with a complete FX triple. Approval / period lock is later.
      </p>
      <label className="field" style={{ maxWidth: 200 }}>
        As-of
        <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </label>
      {data && (
        <>
          <div className="cards">
            <div className="card">
              <div className="k">Cost</div>
              <div className="v">{data.rollup.cost.total ?? "—"}</div>
            </div>
            <div className="card">
              <div className="k">NAV</div>
              <div className="v">{data.rollup.nav.total ?? "—"}</div>
              {!data.rollup.nav.complete && <div className="lede">Incomplete</div>}
            </div>
            <div className="card">
              <div className="k">MOIC</div>
              <div className="v">{data.rollup.moic == null ? "—" : `${data.rollup.moic.toFixed(2)}x`}</div>
            </div>
            <div className="card">
              <div className="k">Bridge Δ</div>
              <div className="v">{data.bridge.deltaNav == null ? "—" : data.bridge.deltaNav.toLocaleString("en-IN")}</div>
              <div className="lede">vs {data.priorAsOf}</div>
            </div>
          </div>
          {data.rollup.unmarked.length > 0 && (
            <p className="lede">Unmarked: {data.rollup.unmarked.map((u) => u.companyName).join(", ")}</p>
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
                    <th>Current</th>
                    <th>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bridge.lines.map((l) => (
                    <tr key={`${l.companyName}-${l.currentAsOf}`}>
                      <td>{l.companyName}</td>
                      <td>{l.priorMark ?? "—"}</td>
                      <td>{l.currentMark ?? "—"}</td>
                      <td>{l.delta == null ? "—" : l.delta.toLocaleString("en-IN")}</td>
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
                <th>Cost</th>
                <th>Mark</th>
                <th>As-of</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((p) => (
                <tr key={p.position.id}>
                  <td>{p.companyName}</td>
                  <td>{p.fundName}</td>
                  <td>{p.cost ?? "—"}</td>
                  <td>
                    <Fact
                      display={p.mark == null ? "—" : String(p.mark)}
                      isFact={Boolean(p.sourceRefId && p.mark != null)}
                      sourcePath={sourcePathFor(data.sourceRefs, p.sourceRefId)}
                    />
                  </td>
                  <td>{p.markAsOf ?? "—"}</td>
                  <td>{p.method ?? "—"}</td>
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
                    {p.companyName}
                  </option>
                ))}
              </select>
              <input
                placeholder="Mark value"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
              <input
                placeholder="Method"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              />
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
