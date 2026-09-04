"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { METRIC_CATALOG, metricByKey } from "@venture-os/core";
import { Fact, Shell } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";

type Cell = {
  display: string;
  isFact: boolean;
  periodEnd?: string | null;
  fxNote?: string | null;
  sourceRefId?: string | null;
  inrCrore?: number | null;
};
type Data = {
  metrics: string[];
  labels?: Record<string, string>;
  matrix: { company: { id: string; name: string }; cells: Record<string, Cell> }[];
  companies?: { id: string; name: string; stage?: string | null; sector?: string | null }[];
  stages?: string[];
  sectors?: string[];
  periods?: string[];
  sourceRefs?: { id: string; documentId: string }[];
};

const ALL_METRICS = [
  "net_revenue",
  "cash",
  "burn",
  "gross_margin_pct",
  "runway_months",
  "headcount",
  "plan_revenue",
  "cac",
];

function metricLabel(key: string, labels?: Record<string, string>) {
  return labels?.[key] ?? metricByKey(key)?.label ?? key.replaceAll("_", " ");
}

export default function ComparePage() {
  const [data, setData] = useState<Data | null>(null);
  const [metrics, setMetrics] = useState<string[]>(["net_revenue", "cash", "burn", "gross_margin_pct", "runway_months"]);
  const [selected, setSelected] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [periodEnd, setPeriodEnd] = useState("");
  const [stage, setStage] = useState("");
  const [sector, setSector] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [sortKey, setSortKey] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const m = p.get("metrics");
    if (m) setMetrics(m.split(",").map((x) => x.trim()).filter(Boolean));
    const ids = p.get("companyIds");
    if (ids !== null) {
      setTouched(true);
      setSelected(ids.split(",").map((x) => x.trim()).filter(Boolean));
    }
    const pe = p.get("periodEnd") ?? p.get("period");
    if (pe) setPeriodEnd(pe);
    const st = p.get("stage");
    if (st) setStage(st);
    const se = p.get("sector");
    if (se) setSector(se);
    setHydrated(true);
  }, []);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("metrics", metrics.join(","));
    if (touched) p.set("companyIds", selected.join(","));
    if (periodEnd) p.set("periodEnd", periodEnd);
    if (stage) p.set("stage", stage);
    if (sector) p.set("sector", sector);
    return p.toString();
  }, [metrics, selected, periodEnd, touched, stage, sector]);

  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    setErr("");
    api<Data>(`/api/compare?${qs}`)
      .then(setData)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
    const next = `${window.location.pathname}?${qs}`;
    window.history.replaceState(null, "", next);
  }, [qs, hydrated]);

  function toggleMetric(m: string) {
    setMetrics((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }
  function toggleCo(id: string) {
    const allIds = data?.companies?.map((c) => c.id) ?? [];
    setTouched(true);
    setSelected((cur) => {
      const current = !touched || cur.length === 0 ? allIds : cur;
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    });
  }

  function exportCsv() {
    if (!data) return;
    const header = [
      "Company",
      ...data.metrics.flatMap((m) => {
        const label = metricLabel(m, data.labels);
        return [label, `${label} (INR Cr)`, `${label} (EUR)`];
      }),
    ];
    const lines = [
      header.join(","),
      ...visible.map((row) =>
        [
          row.company.name,
          ...data.metrics.flatMap((m) => {
            const cell = row.cells[m];
            const cr = cell?.inrCrore != null ? String(cell.inrCrore) : "—";
            const eur = cell?.fxNote && !cell.fxNote.startsWith("EUR —") ? cell.fxNote : "—";
            return [`"${cell?.display ?? "—"}"`, `"${cr}"`, `"${eur}"`];
          }),
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "compare.csv";
    a.click();
  }

  const checked = (id: string) => {
    if (!touched) return true;
    return selected.includes(id);
  };

  const visible = useMemo(() => {
    if (!data) return [];
    let rows = data.matrix;
    if (hideEmpty) {
      rows = rows.filter((row) => data.metrics.some((m) => row.cells[m]?.isFact));
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a.cells[sortKey]?.display ?? "—";
        const bv = b.cells[sortKey]?.display ?? "—";
        if (av === "—" && bv !== "—") return 1;
        if (bv === "—" && av !== "—") return -1;
        return av.localeCompare(bv, undefined, { numeric: true });
      });
    }
    return rows;
  }, [data, hideEmpty, sortKey]);

  return (
    <Shell>
      <h1>Compare</h1>
      <p className="lede">
        Confirmed objective book only. No imputation, no peer-average fill. Empty cell is —. Canonical INR Cr shows
        when the unit converts; otherwise —. EUR only with a complete FX triple. Uncheck a name to exclude it. Stage
        and sector filter peers; they do not invent a peer set.
      </p>
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      <div className="row" style={{ margin: "12px 0", flexWrap: "wrap" }}>
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
        <label className="field">
          Stage
          <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
            <option value="">All stages</option>
            {(data?.stages ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Sector
          <select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
            <option value="">All sectors</option>
            {(data?.sectors ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="lede">
          <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} /> Hide empty
          rows
        </label>
        <button className="btn ghost sm" type="button" onClick={exportCsv} disabled={!visible.length}>
          Export CSV
        </button>
      </div>
      <div className="row">
        {(data?.companies ?? []).map((c) => (
          <label key={c.id} className="lede">
            <input type="checkbox" checked={checked(c.id)} onChange={() => toggleCo(c.id)} /> {c.name}
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        {ALL_METRICS.map((m) => (
          <label key={m} className="lede">
            <input type="checkbox" checked={metrics.includes(m)} onChange={() => toggleMetric(m)} />{" "}
            {METRIC_CATALOG.find((x) => x.key === m)?.label ?? m.replaceAll("_", " ")}
          </label>
        ))}
      </div>
      {loading && <p className="lede">Loading compare…</p>}
      {!loading && !err && visible.length === 0 ? (
        <div className="empty">Add companies and confirm metrics to compare, or turn off “hide empty rows.”</div>
      ) : (
        !loading &&
        data && (
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              {data.metrics.map((m) => (
                <th key={m}>
                  <button type="button" className="chip" onClick={() => setSortKey(m)}>
                    {metricLabel(m, data.labels)}
                    {sortKey === m ? " ↓" : ""}
                  </button>
                  <div className="lede">native · INR Cr · EUR</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.company.id}>
                <td>
                  <Link href={`/companies/${row.company.id}`}>{row.company.name}</Link>
                </td>
                {data.metrics.map((m) => (
                  <td key={m}>
                    <div>
                      <div className="lede" data-testid="compare-inr-cr">
                        INR Cr {row.cells[m]?.inrCrore != null ? row.cells[m]!.inrCrore : "—"}
                      </div>
                      <Fact
                        {...row.cells[m]!}
                        note={[row.cells[m]?.fxNote, row.cells[m]?.periodEnd].filter(Boolean).join(" · ") || null}
                        sourcePath={sourcePathFor(data.sourceRefs, row.cells[m]?.sourceRefId)}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        )
      )}
    </Shell>
  );
}