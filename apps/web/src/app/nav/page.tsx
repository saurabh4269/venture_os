"use client";

import { useEffect, useState } from "react";
import { Fact, Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Nav = {
  asOf: string;
  rollup: {
    nav: { total: number | null; complete: boolean; missing: number };
    cost: { total: number | null; complete: boolean };
    moic: number | null;
    unmarked: { companyName: string }[];
  };
  positions: {
    position: { id: string; costBasis: number | null; ownershipPct: number | null };
    companyName: string;
    fundName: string;
    cost: number | null;
    mark: number | null;
    markAsOf: string | null;
    method: string | null;
    sourceRefId: string | null;
  }[];
};

export default function NavPage() {
  const [data, setData] = useState<Nav | null>(null);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ positionId: "", value: "", method: "last_round", rationale: "" });

  function load() {
    api<Nav>(`/api/nav?asOf=${asOf}`).then(setData);
  }
  useEffect(() => {
    load();
  }, [asOf]);

  async function addMark(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/nav/marks", {
      method: "POST",
      body: JSON.stringify({
        positionId: form.positionId,
        asOf,
        method: form.method,
        value: form.value === "" ? null : Number(form.value),
        rationale: form.rationale,
      }),
    });
    load();
  }

  return (
    <Shell>
      <h1>NAV</h1>
      <p className="lede">
        Deterministic from positions and marks. A total that skips unmarked names says so. MOIC is blank unless the
        rollup is complete.
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
          </div>
          {data.rollup.unmarked.length > 0 && (
            <p className="lede">Unmarked: {data.rollup.unmarked.map((u) => u.companyName).join(", ")}</p>
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
                    <Fact display={p.mark == null ? "—" : String(p.mark)} isFact={Boolean(p.sourceRefId && p.mark != null)} />
                  </td>
                  <td>{p.markAsOf ?? "—"}</td>
                  <td>{p.method ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={addMark} className="row" style={{ marginTop: 16 }}>
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
            <button className="btn sm">Add mark</button>
          </form>
        </>
      )}
    </Shell>
  );
}
