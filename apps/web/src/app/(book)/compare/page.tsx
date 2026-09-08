"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import useSWR from "swr";
import { METRIC_CATALOG, metricByKey } from "@venture-os/core";
import {
  ComparePeerColumns,
  ComparePeerRadar,
  ComparePeerScatter,
} from "@/components/BookCharts";
import { CompanyMark, PageHead, Panel } from "@/components/BookUI";
import { Fact } from "@/components/Shell";
import { sourcePathFor } from "@/lib/api";
import { bookFetcher } from "@/lib/book-data";
import { bookErrorMessage } from "@/lib/wake";

type Cell = {
  display: string;
  isFact: boolean;
  periodEnd?: string | null;
  fxNote?: string | null;
  sourceRefId?: string | null;
  inrCrore?: number | null;
  valueNumeric?: number | null;
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

const CHARTABLE = ["cash", "burn", "net_revenue", "runway_months", "gross_margin_pct", "headcount"] as const;

function metricLabel(key: string, labels?: Record<string, string>) {
  return labels?.[key] ?? metricByKey(key)?.label ?? key.replaceAll("_", " ");
}

function unitHint(key: string) {
  if (key === "runway_months") return "mo";
  if (key === "gross_margin_pct") return "%";
  if (key === "headcount") return "";
  return "Cr";
}

function chartValue(cell: Cell | undefined, metric: string): number | null {
  if (!cell?.isFact) return null;
  if (metric === "cash" || metric === "burn" || metric === "net_revenue" || metric === "plan_revenue" || metric === "cac") {
    return cell.inrCrore ?? cell.valueNumeric ?? null;
  }
  return cell.valueNumeric ?? null;
}

/** Compare page: never show em/en dash placeholders. Absent stays blank. */
function cleanCell(cell: Cell | undefined): { display: string; isFact: boolean; note: string | null } {
  if (!cell || !cell.isFact) return { display: "", isFact: false, note: null };
  const display = cell.display.replace(/[—–]/g, "").trim();
  if (!display || display === "-") return { display: "", isFact: false, note: null };
  const rawNote = cell.periodEnd ?? cell.fxNote ?? null;
  const note =
    rawNote && !/[—–]/.test(rawNote) && rawNote.trim() !== "-"
      ? rawNote.replace(/[—–]/g, "").trim() || null
      : cell.periodEnd && !/[—–]/.test(cell.periodEnd)
        ? cell.periodEnd
        : null;
  return { display, isFact: true, note };
}

function PickerMenu({
  open,
  onClose,
  children,
  align = "left",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className={`compare-picker-menu${align === "right" ? " is-right" : ""}`} role="dialog">
      {children}
    </div>
  );
}

export default function ComparePage() {
  const [metrics, setMetrics] = useState<string[]>(["net_revenue", "cash", "burn", "gross_margin_pct", "runway_months"]);
  const [selected, setSelected] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [periodEnd, setPeriodEnd] = useState("");
  const [stage, setStage] = useState("");
  const [sector, setSector] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [sortKey, setSortKey] = useState("");
  const [chartMetric, setChartMetric] = useState<string>("cash");
  const [peersOpen, setPeersOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [err, setErr] = useState("");
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
    const cm = p.get("chart");
    if (cm && (CHARTABLE as readonly string[]).includes(cm)) setChartMetric(cm);
    setHydrated(true);
  }, []);

  /** Peer filter is client-side so chips reshape charts instantly (no API round-trip). */
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("metrics", metrics.join(","));
    if (periodEnd) p.set("periodEnd", periodEnd);
    if (stage) p.set("stage", stage);
    if (sector) p.set("sector", sector);
    return p.toString();
  }, [metrics, periodEnd, stage, sector]);

  const urlQs = useMemo(() => {
    const p = new URLSearchParams(qs);
    if (touched) p.set("companyIds", selected.join(","));
    if (chartMetric) p.set("chart", chartMetric);
    return p.toString();
  }, [qs, touched, selected, chartMetric]);

  const compareKey = hydrated ? `/api/compare?${qs}` : null;
  const { data, error, isLoading: loading } = useSWR<Data>(compareKey, bookFetcher);
  useEffect(() => {
    if (error) setErr(bookErrorMessage(error instanceof Error ? error.message : String(error)));
    else setErr("");
  }, [error]);
  useEffect(() => {
    if (!hydrated) return;
    const next = `${window.location.pathname}?${urlQs}`;
    window.history.replaceState(null, "", next);
  }, [urlQs, hydrated]);

  useEffect(() => {
    if (metrics.includes(chartMetric)) return;
    const next = metrics.find((m) => (CHARTABLE as readonly string[]).includes(m)) ?? "cash";
    setChartMetric(next);
  }, [metrics, chartMetric]);

  function toggleMetric(m: string) {
    setMetrics((cur) => {
      if (cur.includes(m)) {
        if (cur.length <= 1) return cur;
        return cur.filter((x) => x !== m);
      }
      return [...cur, m];
    });
  }

  const peerPool = useMemo(() => {
    if (!data?.companies) return [];
    return data.companies.filter((c) => {
      if (stage && (c.stage ?? "") !== stage) return false;
      if (sector && (c.sector ?? "") !== sector) return false;
      return true;
    });
  }, [data?.companies, stage, sector]);

  function toggleCo(id: string) {
    const allIds = peerPool.map((c) => c.id);
    setTouched(true);
    setSelected((cur) => {
      const current = !touched || cur.length === 0 ? allIds : cur;
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    });
  }

  function selectAllPeers() {
    setTouched(false);
    setSelected([]);
  }

  function clearPeers() {
    setTouched(true);
    setSelected([]);
  }

  const checked = (id: string) => {
    if (!touched) return true;
    return selected.includes(id);
  };

  const peerCount = useMemo(() => {
    if (!touched) return peerPool.length;
    return selected.filter((id) => peerPool.some((c) => c.id === id)).length;
  }, [peerPool, touched, selected]);

  const visible = useMemo(() => {
    if (!data) return [];
    let rows = data.matrix;
    if (touched) {
      const allow = new Set(selected);
      rows = rows.filter((row) => allow.has(row.company.id));
    }
    if (hideEmpty) {
      rows = rows.filter((row) => data.metrics.some((m) => row.cells[m]?.isFact));
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = chartValue(a.cells[sortKey], sortKey);
        const bv = chartValue(b.cells[sortKey], sortKey);
        if (av == null && bv != null) return 1;
        if (bv == null && av != null) return -1;
        if (av != null && bv != null) return bv - av;
        const as = a.cells[sortKey]?.display?.replace(/[—–]/g, "").trim() ?? "";
        const bs = b.cells[sortKey]?.display?.replace(/[—–]/g, "").trim() ?? "";
        return as.localeCompare(bs, undefined, { numeric: true });
      });
    }
    return rows;
  }, [data, hideEmpty, sortKey, touched, selected]);

  const chartRows = useMemo(() => {
    return visible
      .map((row) => {
        const cell = row.cells[chartMetric];
        const value = chartValue(cell, chartMetric);
        if (value == null) return null;
        return { name: row.company.name, value, periodEnd: cell?.periodEnd ?? null };
      })
      .filter((r): r is { name: string; value: number; periodEnd: string | null } => r != null);
  }, [visible, chartMetric]);

  const radarPeers = useMemo(() => {
    return visible.map((row) => ({
      name: row.company.name,
      values: Object.fromEntries(
        data?.metrics.map((m) => [m, chartValue(row.cells[m], m)] as const) ?? [],
      ) as Record<string, number | null>,
    }));
  }, [visible, data?.metrics]);

  const scatterPair = useMemo(() => {
    const xKey = metrics.includes("cash") ? "cash" : metrics.find((m) => (CHARTABLE as readonly string[]).includes(m));
    const yKey =
      metrics.includes("runway_months") && xKey !== "runway_months"
        ? "runway_months"
        : metrics.find((m) => m !== xKey && (CHARTABLE as readonly string[]).includes(m));
    if (!xKey || !yKey) return null;
    const rows = visible
      .map((row) => {
        const x = chartValue(row.cells[xKey], xKey);
        const y = chartValue(row.cells[yKey], yKey);
        if (x == null || y == null) return null;
        return { name: row.company.name, x, y };
      })
      .filter((r): r is { name: string; x: number; y: number } => r != null);
    return { xKey, yKey, rows };
  }, [visible, metrics]);

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
            const cr = cell?.inrCrore != null ? String(cell.inrCrore) : "";
            const eur =
              cell?.fxNote && !/[—–]/.test(cell.fxNote) ? cell.fxNote.replace(/[—–]/g, "").trim() : "";
            const shown = cell?.isFact ? (cell.display ?? "").replace(/[—–]/g, "").trim() : "";
            return [`"${shown}"`, `"${cr}"`, `"${eur}"`];
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

  const filterActive = Boolean(periodEnd || stage || sector || touched || !hideEmpty);

  return (
    <div className="compare-page">
      <PageHead
        title="Compare"
        kicker="Peer book"
        lede="Toggle peers to reshape the radar, columns, and scatter — charts only include names you leave on."
        actions={
          <button className="btn ghost sm" type="button" onClick={exportCsv} disabled={!visible.length}>
            Export
          </button>
        }
      />

      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}

      <div className="table-tools compare-tools">
        <label className="field table-tools-field">
          <span className="sr-only">Period</span>
          <select value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} aria-label="Period">
            <option value="">Latest period</option>
            {(data?.periods ?? []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="field table-tools-field">
          <span className="sr-only">Stage</span>
          <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
            <option value="">All stages</option>
            {(data?.stages ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field table-tools-field">
          <span className="sr-only">Sector</span>
          <select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
            <option value="">All sectors</option>
            {(data?.sectors ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field table-tools-field">
          <span className="sr-only">Column metric</span>
          <select
            value={chartMetric}
            onChange={(e) => setChartMetric(e.target.value)}
            aria-label="Column chart metric"
          >
            {CHARTABLE.filter((m) => metrics.includes(m)).map((m) => (
              <option key={m} value={m}>
                Columns: {metricLabel(m, data?.labels)}
              </option>
            ))}
          </select>
        </label>

        <div className="compare-picker">
          <button
            type="button"
            className={`btn ghost sm${peersOpen ? " is-on" : ""}`}
            aria-expanded={peersOpen}
            onClick={() => {
              setPeersOpen((v) => !v);
              setMetricsOpen(false);
            }}
          >
            Peers ({peerCount})
          </button>
          <PickerMenu open={peersOpen} onClose={() => setPeersOpen(false)}>
            <div className="compare-picker-head">
              <span className="page-kicker">Companies</span>
              <div className="row" style={{ gap: 10 }}>
                <button type="button" className="linkish" onClick={selectAllPeers}>
                  All
                </button>
                <button type="button" className="linkish" onClick={clearPeers}>
                  None
                </button>
              </div>
            </div>
            <ul className="compare-picker-list">
              {peerPool.map((c) => (
                <li key={c.id}>
                  <label>
                    <input type="checkbox" checked={checked(c.id)} onChange={() => toggleCo(c.id)} />
                    <CompanyMark name={c.name} />
                    <span>{c.name}</span>
                    {c.stage ? <span className="lede">{c.stage}</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          </PickerMenu>
        </div>

        <div className="compare-picker">
          <button
            type="button"
            className={`btn ghost sm${metricsOpen ? " is-on" : ""}`}
            aria-expanded={metricsOpen}
            onClick={() => {
              setMetricsOpen((v) => !v);
              setPeersOpen(false);
            }}
          >
            Metrics ({metrics.length})
          </button>
          <PickerMenu open={metricsOpen} onClose={() => setMetricsOpen(false)} align="right">
            <div className="compare-picker-head">
              <span className="page-kicker">Columns</span>
            </div>
            <ul className="compare-picker-list">
              {ALL_METRICS.map((m) => (
                <li key={m}>
                  <label>
                    <input type="checkbox" checked={metrics.includes(m)} onChange={() => toggleMetric(m)} />
                    <span>{METRIC_CATALOG.find((x) => x.key === m)?.label ?? m.replaceAll("_", " ")}</span>
                  </label>
                </li>
              ))}
            </ul>
          </PickerMenu>
        </div>

        <label className="lede compare-hide-empty">
          <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} /> Hide empty
        </label>

        {filterActive ? (
          <button
            type="button"
            className="linkish push"
            onClick={() => {
              setPeriodEnd("");
              setStage("");
              setSector("");
              setTouched(false);
              setSelected([]);
              setHideEmpty(true);
              setSortKey("");
            }}
          >
            Reset
          </button>
        ) : null}
      </div>

      {loading && <p className="lede">Loading</p>}

      {!loading && data ? (
        <div className="compare-peers-rail" aria-label="Companies in this compare">
          <div className="compare-peers-head">
            <div>
              <strong>Peers in view · {peerCount}</strong>
              <p className="lede">
                On = included in radar, columns, scatter, and matrix. Off removes that company immediately.
              </p>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button type="button" className="linkish" onClick={selectAllPeers}>
                All
              </button>
              <button type="button" className="linkish" onClick={clearPeers}>
                None
              </button>
            </div>
          </div>
          <div className="compare-peer-chips">
            {peerPool.map((c) => {
              const on = checked(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`peer-chip${on ? " is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggleCo(c.id)}
                >
                  <CompanyMark name={c.name} />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!loading && !err && visible.length === 0 ? (
        <div className="empty">
          <strong>Nothing to compare</strong>
          Confirm metrics on the book, turn peers back on, or turn off Hide empty.
        </div>
      ) : null}

      {!loading && data && visible.length > 0 ? (
        <div className="compare-stack">
          <Panel
            title="Peer fingerprints"
            kicker={`Apex radar · ${Math.min(peerCount, 6)} peers`}
          >
            <p className="lede compare-chart-why">
              Shape of booked metrics for the peers you left on. Axes are relative within this set — flip a peer
              chip and the polygons change.
            </p>
            <ComparePeerRadar
              peers={radarPeers}
              metricKeys={data.metrics.filter((m) => (CHARTABLE as readonly string[]).includes(m))}
              metricLabels={data.labels ?? {}}
            />
          </Panel>

          <div className={`chart-grid${scatterPair && scatterPair.rows.length >= 2 ? "" : " chart-grid-single"}`}>
            <Panel title={metricLabel(chartMetric, data.labels)} kicker="Chart.js columns">
              <p className="lede compare-chart-why">
                Ranked {metricLabel(chartMetric, data.labels).toLowerCase()} for selected peers only.
              </p>
              <ComparePeerColumns
                rows={chartRows}
                metricLabel={metricLabel(chartMetric, data.labels)}
                unitHint={unitHint(chartMetric)}
              />
            </Panel>
            {scatterPair && scatterPair.rows.length >= 2 ? (
              <Panel
                title={`${metricLabel(scatterPair.xKey, data.labels)} × ${metricLabel(scatterPair.yKey, data.labels)}`}
                kicker="Apex scatter"
              >
                <p className="lede compare-chart-why">
                  Position of each selected peer on two booked axes. Zoom if the cluster is tight.
                </p>
                <ComparePeerScatter
                  rows={scatterPair.rows}
                  xLabel={metricLabel(scatterPair.xKey, data.labels)}
                  yLabel={metricLabel(scatterPair.yKey, data.labels)}
                  xUnit={unitHint(scatterPair.xKey)}
                  yUnit={unitHint(scatterPair.yKey)}
                />
              </Panel>
            ) : null}
          </div>

          <Panel title="Matrix" kicker={`${visible.length} companies`} flush>
            <div className="table-scroll">
              <table className="table-hover compare-matrix">
                <thead>
                  <tr>
                    <th>Company</th>
                    {data.metrics.map((m) => (
                      <th key={m}>
                        <button
                          type="button"
                          className={`compare-sort${sortKey === m ? " on" : ""}`}
                          onClick={() => setSortKey(sortKey === m ? "" : m)}
                        >
                          {metricLabel(m, data.labels)}
                          {sortKey === m ? " ↓" : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.company.id}>
                      <td>
                        <div className="company-cell">
                          <CompanyMark name={row.company.name} />
                          <Link className="company-link" href={`/companies/${row.company.id}`}>
                            {row.company.name}
                          </Link>
                        </div>
                      </td>
                      {data.metrics.map((m) => {
                        const cell = row.cells[m];
                        const cleaned = cleanCell(cell);
                        return (
                          <td key={m}>
                            {cleaned.isFact ? (
                              <Fact
                                display={cleaned.display}
                                isFact
                                note={cleaned.note}
                                sourcePath={sourcePathFor(data.sourceRefs, cell?.sourceRefId)}
                              />
                            ) : (
                              <span className="fact-blank" aria-hidden />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
