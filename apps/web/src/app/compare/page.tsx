"use client";

import { useEffect, useMemo, useState } from "react";
import { Fact, Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Cell = { display: string; isFact: boolean; periodEnd?: string | null; fxNote?: string | null };
type Data = {
  metrics: string[];
  matrix: { company: { id: string; name: string }; cells: Record<string, Cell> }[];
  companies?: { id: string; name: string }[];
  periods?: string[];
};

const ALL_METRICS = ["net_revenue", "cash", "burn", "gross_margin_pct", "runway_months", "headcount", "plan_revenue"];

export default function ComparePage() {
  const [data, setData] = useState<Data | null>(null);
  const [metrics, setMetrics] = useState<string[]>(["net_revenue", "cash", "burn", "gross_margin_pct", "runway_months"]);
  const [selected, setSelected] = useState<string[]>([]);
  const [periodEnd, setPeriodEnd] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("metrics", metrics.join(","));
    if (selected.length) p.set("companyIds", selected.join(","));
    if (periodEnd) p.set("periodEnd", periodEnd);
    return p.toString();
  }, [metrics, selected, periodEnd]);

  useEffect(() => {
    api<Data>(`/api/compare?${qs}`).then(setData);
  }, [qs]);

  function toggleMetric(m: string) {
    setMetrics((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }
  function toggleCo(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function exportCsv() {
    if (!data) return;
    const header = ["Company", ...data.metrics];
    const lines = [
      header.join(","),
      ...data.matrix.map((row) =>
        [row.company.name, ...data.metrics.map((m) => `"${row.cells[m]?.display ?? "—"}"`)].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "compare.csv";
    a.click();
  }

  return (
    <Shell>
      <h1>Compare</h1>
      <p className="lede">Confirmed book only. No imputation, no peer-average fill. Empty cell is —.</p>
      <div className="row" style={{ margin: "12px 0" }}>
        <label className="field">
          Period
          <select value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} aria-label="Period">
            <option value="">Latest per company</option>
            {(data?.periods ?? []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button className="btn ghost sm" type="button" onClick={exportCsv} disabled={!data?.matrix.length}>
          Export CSV
        </button>
      </div>
      <div className="row">
        {(data?.companies ?? []).map((c) => (
          <label key={c.id} className="lede">
            <input type="checkbox" checked={selected.includes(c.id) || selected.length === 0} onChange={() => toggleCo(c.id)} />{" "}
            {c.name}
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        {ALL_METRICS.map((m) => (
          <label key={m} className="lede">
            <input type="checkbox" checked={metrics.includes(m)} onChange={() => toggleMetric(m)} /> {m.replaceAll("_", " ")}
          </label>
        ))}
      </div>
      {!data || data.matrix.length === 0 ? (
        <div className="empty">Add companies and confirm metrics to compare.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Company</th>
              {data.metrics.map((m) => (
                <th key={m}>{m.replaceAll("_", " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row) => (
              <tr key={row.company.id}>
                <td>{row.company.name}</td>
                {data.metrics.map((m) => (
                  <td key={m}>
                    <Fact {...row.cells[m]!} note={row.cells[m]?.fxNote} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
