"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import useSWR from "swr";
import { METRIC_CATALOG, metricByKey } from "@venture-os/core";
import { ComparePeerBars } from "@/components/BookCharts";
import { PageHead, Panel } from "@/components/BookUI";
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

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("metrics", metrics.join(","));
    if (touched) p.set("companyIds", selected.join(","));
    if (periodEnd) p.set("periodEnd", periodEnd);
    if (stage) p.set("stage", stage);
    if (sector) p.set("sector", sector);
    if (chartMetric) p.set("chart", chartMetric);
    return p.toString();
  }, [metrics, selected, periodEnd, touched, stage, sector, chartMetric]);

  const compareKey = hydrated ? `/api/compare?${qs}` : null;
  const { data, error, isLoading: loading } = useSWR<Data>(compareKey, bookFetcher);
  useEffect(() => {
    if (error) setErr(bookErrorMessage(error instanceof Error ? error.message : String(error)));
    else setErr("");
  }, [error]);
  useEffect(() => {
    if (!hydrated) return;
    const next = `${window.location.pathname}?${qs}`;
    window.history.replaceState(null, "", next);
  }, [qs, hydrated]);

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

  function toggleCo(id: string) {
    const allIds = data?.companies?.map((c) => c.id) ?? [];
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
    const all = data?.companies?.length ?? 0;
    if (!touched) return all;
    return selected.length;
  }, [data?.companies, touched, selected]);

  const visible = useMemo(() => {
    if (!data) return [];
    let rows = data.matrix;
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
  }, [data, hideEmpty, sortKey]);

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

  const secondaryMetric = useMemo(() => {
    const prefer = ["runway_months", "burn", "net_revenue", "cash"].filter((m) => m !== chartMetric && metrics.includes(m));
    return prefer[0] ?? null;
  }, [chartMetric, metrics]);

  const secondaryRows = useMemo(() => {
    if (!secondaryMetric) return [];
    return visible
      .map((row) => {
        const cell = row.cells[secondaryMetric];
        const value = chartValue(cell, secondaryMetric);
        if (value == null) return null;
        return { name: row.company.name, value, periodEnd: cell?.periodEnd ?? null };
      })
      .filter((r): r is { name: string; value: number; periodEnd: string | null } => r != null);
  }, [visible, secondaryMetric]);

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
          <span className="sr-only">Chart metric</span>
          <select
            value={chartMetric}
            onChange={(e) => setChartMetric(e.target.value)}
            aria-label="Chart metric"
          >
            {CHARTABLE.filter((m) => metrics.includes(m)).map((m) => (
              <option key={m} value={m}>
                Chart: {metricLabel(m, data?.labels)}
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
              {(data?.companies ?? []).map((c) => (
                <li key={c.id}>
                  <label>
                    <input type="checkbox" checked={checked(c.id)} onChange={() => toggleCo(c.id)} />
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

      {!loading && !err && visible.length === 0 ? (
        <div className="empty">
          <strong>Nothing to compare</strong>
          Confirm metrics on the book, widen peers, or turn off Hide empty.
        </div>
      ) : null}

      {!loading && data && visible.length > 0 ? (
        <div className="compare-stack">
          <div className={`chart-grid${secondaryMetric ? "" : " chart-grid-single"}`}>
            <Panel title={metricLabel(chartMetric, data.labels)} kicker="Peers (booked)">
              <ComparePeerBars
                rows={chartRows}
                metricLabel={metricLabel(chartMetric, data.labels)}
                unitHint={unitHint(chartMetric)}
              />
            </Panel>
            {secondaryMetric ? (
              <Panel title={metricLabel(secondaryMetric, data.labels)} kicker="Peers (booked)">
                <ComparePeerBars
                  rows={secondaryRows}
                  metricLabel={metricLabel(secondaryMetric, data.labels)}
                  unitHint={unitHint(secondaryMetric)}
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
                        <Link className="company-link" href={`/companies/${row.company.id}`}>
                          {row.company.name}
                        </Link>
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
