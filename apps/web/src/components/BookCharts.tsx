"use client";

/**
 * Book charts — Chart.js (canvas) + ApexCharts (SVG / sparklines).
 * Theme: `@/lib/chart-theme` (Vestberry-inspired screenshot + Chart.js / Apex docs).
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  ArcElement,
  Chart as ChartJS,
  Tooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { ApexOptions } from "apexcharts";
import {
  BOOK_CHART,
  apexBarToolbar,
  apexBookBase,
  apexBubbleBase,
  apexRadarBase,
  apexSparkline,
  doughnutOptions,
  fmtChartNum,
  fmtChartPeriod,
  peerColor,
} from "@/lib/chart-theme";
import { CompanyMark } from "@/components/BookUI";
import { IconDownload } from "@/components/Icons";

ChartJS.register(ArcElement, Tooltip);

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="chart-empty" role="status">
      {label}
    </div>
  );
}

function useApexChartId() {
  return `vos-${useId().replace(/:/g, "")}`;
}

async function downloadApexPng(chartId: string, filename: string) {
  const ApexCharts = (await import("apexcharts")).default;
  const result = (await ApexCharts.exec(chartId, "dataURI", { type: "png", scale: 2 })) as
    | { imgURI?: string }
    | undefined;
  if (!result?.imgURI) return;
  const a = document.createElement("a");
  a.href = result.imgURI;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function ChartShell({
  chartId,
  filename,
  label,
  children,
  foot,
}: {
  chartId: string;
  filename: string;
  label: string;
  children: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <div className="chart-shell" aria-label={label}>
      <div className="chart-tools">
        <button
          type="button"
          className="chart-tool-btn"
          aria-label="Download chart as PNG"
          title="Download PNG"
          onClick={() => void downloadApexPng(chartId, filename)}
        >
          <IconDownload />
        </button>
      </div>
      <div className="chart-frame chart-frame-apex">{children}</div>
      {foot ? <div className="chart-foot-wrap">{foot}</div> : null}
    </div>
  );
}

function withChartId(options: ApexOptions, chartId: string): ApexOptions {
  return {
    ...options,
    chart: {
      ...options.chart,
      id: chartId,
    },
  };
}

/** Apex sparkline for KPI cards (lime area, no axes). */
export function KpiSparkline({
  values,
  color,
  height = 44,
}: {
  values: Array<number | null | undefined>;
  color?: string;
  height?: number;
}) {
  const reduce = useReduceMotion();
  const seriesData = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (seriesData.length < 2) return null;
  const options = apexSparkline(reduce, color ?? BOOK_CHART.limeDeep);
  return (
    <div className="kpi-spark" aria-hidden>
      <ApexChart type="area" height={height} width="100%" options={options} series={[{ data: seriesData }]} />
    </div>
  );
}

/** Chart.js donut — compact ring + legend under (fits half-width Command panels). */
export function CoverageMixChart({
  booked,
  gap,
  review,
}: {
  booked: number;
  gap: number;
  review: number;
}) {
  const reduce = useReduceMotion();
  const slices = useMemo(
    () =>
      [
        { name: "Booked", value: booked, color: BOOK_CHART.forest },
        { name: "Gap", value: gap, color: BOOK_CHART.danger },
        { name: "Review", value: review, color: BOOK_CHART.limeDeep },
      ].filter((d) => d.value > 0),
    [booked, gap, review],
  );
  const total = useMemo(() => slices.reduce((s, d) => s + d.value, 0), [slices]);
  const options = useMemo(
    () =>
      doughnutOptions(reduce, (ctx) => {
        const v = Number(ctx.raw ?? 0);
        const pct = total ? Math.round((v / total) * 100) : 0;
        return ` ${ctx.label}: ${fmtChartNum(v)} (${pct}%)`;
      }),
    [reduce, total],
  );

  if (slices.length === 0) return <ChartEmpty label="No companies to chart." />;

  return (
    <div className="chart-donut-stack" aria-label="Coverage mix">
      <div className="chart-donut-ring">
        <div className="chart-frame chart-frame-js chart-donut-canvas">
          <Doughnut
            data={{
              labels: slices.map((s) => s.name),
              datasets: [
                {
                  data: slices.map((s) => s.value),
                  backgroundColor: slices.map((s) => s.color),
                  borderColor: BOOK_CHART.paper,
                  borderWidth: 2,
                  hoverOffset: 4,
                },
              ],
            }}
            options={options}
          />
        </div>
        <div className="chart-donut-center" aria-hidden>
          <strong>{fmtChartNum(total)}</strong>
          <span>names</span>
        </div>
      </div>
      <ul className="chart-donut-legend">
        {slices.map((s) => {
          const pct = total ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.name}>
              <span className="chart-side-dot" style={{ background: s.color }} />
              <span className="chart-donut-legend-name">{s.name}</span>
              <span className="chart-donut-legend-val num">
                {fmtChartNum(s.value)}
                <span className="lede"> · {pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** ApexCharts horizontal bars — cash by company (drag to zoom). */
export function CashByCompanyChart({
  rows,
}: {
  rows: { name: string; cash: number; periodEnd: string }[];
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  if (rows.length === 0) return <ChartEmpty label="No booked cash to chart." />;

  const height = Math.max(220, rows.length * 28 + 56);
  const base = apexBarToolbar(reduce);
  const options: ApexOptions = withChartId(
    {
      ...base,
      plotOptions: {
        bar: { horizontal: true, borderRadius: 6, barHeight: "68%" },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: rows.map((r) => (r.name.length > 16 ? `${r.name.slice(0, 14)}…` : r.name)),
        labels: {
          style: { colors: BOOK_CHART.muted, fontSize: "11px" },
          formatter: (v) => fmtChartNum(Number(v)),
        },
      },
      yaxis: {
        labels: { style: { colors: BOOK_CHART.muted, fontSize: "11px" }, maxWidth: 120 },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (val, opts) => {
            const row = rows[opts?.dataPointIndex ?? 0];
            const when = row ? ` · as of ${fmtChartPeriod(row.periodEnd)}` : "";
            return `${fmtChartNum(Number(val))}${when}`;
          },
          title: { formatter: () => "Cash" },
        },
        x: {
          formatter: (_val, opts) => rows[opts?.dataPointIndex ?? 0]?.name ?? "Cash",
        },
      },
    },
    chartId,
  );

  return (
    <ChartShell
      chartId={chartId}
      filename="cash-by-company"
      label="Cash by company"
      foot={<p className="chart-foot">Drag to zoom · double-click to reset. Booked cash only.</p>}
    >
      <ApexChart type="bar" height={height} options={options} series={[{ name: "Cash", data: rows.map((r) => r.cash) }]} />
    </ChartShell>
  );
}

function runwayBarColor(months: number) {
  if (months < 3) return BOOK_CHART.danger;
  if (months < 6) return BOOK_CHART.warn;
  if (months < 12) return "#6b8f3a";
  return BOOK_CHART.forest;
}

function runwayBand(months: number): "critical" | "short" | "watch" | "ok" {
  if (months < 3) return "critical";
  if (months < 6) return "short";
  if (months < 12) return "watch";
  return "ok";
}

export type RunwayUrgencyRow = {
  companyId: string;
  name: string;
  months: number;
  priorMonths?: number | null;
  deltaMonths?: number | null;
  periodEnd: string;
  priorPeriodEnd?: string | null;
};

/**
 * Urgency list: company · colored months-left bar · value · Δ when prior exists.
 * Missing prior → blank delta (never invent movement).
 */
export function RunwayUrgencyStrip({ rows }: { rows: RunwayUrgencyRow[] }) {
  const reduce = useReduceMotion();
  if (rows.length === 0) {
    return <ChartEmpty label="No runway yet — need booked cash and burn for at least one company." />;
  }

  const scaleMax = Math.max(12, ...rows.map((r) => r.months));
  const counts = { critical: 0, short: 0, watch: 0, ok: 0 };
  for (const r of rows) counts[runwayBand(r.months)] += 1;

  return (
    <div className="runway-strip" data-testid="runway-urgency-strip">
      <div className="runway-strip-legend" aria-label="Runway thresholds">
        <span className="runway-leg runway-leg-critical">
          &lt;3 mo · {counts.critical}
        </span>
        <span className="runway-leg runway-leg-short">
          &lt;6 mo · {counts.short}
        </span>
        <span className="runway-leg runway-leg-watch">
          &lt;12 mo · {counts.watch}
        </span>
        <span className="runway-leg runway-leg-ok">
          ≥12 mo · {counts.ok}
        </span>
      </div>
      <ul className="runway-strip-list">
        {rows.map((r, i) => {
          const band = runwayBand(r.months);
          const pct = Math.min(100, (r.months / scaleMax) * 100);
          const delta = r.deltaMonths;
          const deltaLabel =
            delta == null
              ? null
              : `${delta > 0 ? "+" : ""}${fmtChartNum(delta)} mo`;
          return (
            <li key={r.companyId} className={`runway-strip-row is-${band}`}>
              <Link className="runway-strip-co" href={`/companies/${r.companyId}`}>
                <CompanyMark name={r.name} size="sm" />
                <span className="runway-strip-name">{r.name}</span>
              </Link>
              <div className="runway-strip-track" aria-hidden>
                <div
                  className={`runway-strip-fill${reduce ? "" : " is-anim"}`}
                  style={{
                    width: `${pct}%`,
                    background: runwayBarColor(r.months),
                    animationDelay: reduce ? undefined : `${Math.min(i, 10) * 40}ms`,
                  }}
                />
                {/* Threshold ticks at 3 / 6 / 12 mo */}
                {[3, 6, 12].map((t) =>
                  t < scaleMax ? (
                    <span
                      key={t}
                      className="runway-strip-tick"
                      style={{ left: `${(t / scaleMax) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
              <div className="runway-strip-meta">
                <strong className="runway-strip-mo">
                  {fmtChartNum(r.months)}
                  <span className="runway-strip-unit"> mo left</span>
                </strong>
                {deltaLabel ? (
                  <span
                    className={`runway-strip-delta${delta! < 0 ? " is-down" : delta! > 0 ? " is-up" : ""}`}
                    title={
                      r.priorPeriodEnd && r.priorMonths != null
                        ? `vs ${fmtChartPeriod(r.priorPeriodEnd)} (${fmtChartNum(r.priorMonths)} mo)`
                        : undefined
                    }
                  >
                    {deltaLabel}
                  </span>
                ) : (
                  <span className="runway-strip-delta is-miss" aria-label="No prior period" />
                )}
                <span className="runway-strip-asof">{fmtChartPeriod(r.periodEnd)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="chart-foot">
        Cash ÷ avg of up to three booked burns · shortest first · Δ blank when prior cash or burn is missing.
      </p>
    </div>
  );
}

/** ApexCharts horizontal bars — runway months by company. */
export function RunwayByCompanyChart({
  rows,
}: {
  rows: { name: string; months: number; periodEnd: string }[];
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  if (rows.length === 0) return <ChartEmpty label="No runway to chart — need booked cash and burn." />;

  const height = Math.max(220, rows.length * 28 + 56);
  const colors = rows.map((r) => runwayBarColor(r.months));
  const base = apexBarToolbar(reduce);
  const options: ApexOptions = withChartId(
    {
      ...base,
      colors,
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: "68%",
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      xaxis: {
        categories: rows.map((r) => (r.name.length > 16 ? `${r.name.slice(0, 14)}…` : r.name)),
        labels: {
          style: { colors: BOOK_CHART.muted, fontSize: "11px" },
          formatter: (v) => fmtChartNum(Number(v)),
        },
      },
      yaxis: {
        labels: { style: { colors: BOOK_CHART.muted, fontSize: "11px" }, maxWidth: 120 },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (val, opts) => {
            const row = rows[opts?.dataPointIndex ?? 0];
            const when = row ? ` · as of ${fmtChartPeriod(row.periodEnd)}` : "";
            return `${fmtChartNum(Number(val))} mo${when}`;
          },
          title: { formatter: () => "Runway" },
        },
        x: {
          formatter: (_val, opts) => rows[opts?.dataPointIndex ?? 0]?.name ?? "Runway",
        },
      },
    },
    chartId,
  );

  return (
    <ChartShell
      chartId={chartId}
      filename="runway-by-company"
      label="Runway by company"
      foot={
        <p className="chart-foot">
          Drag to zoom · double-click to reset. Booked cash ÷ burn only — missing stays off the chart.
        </p>
      }
    >
      <ApexChart type="bar" height={height} options={options} series={[{ name: "Runway", data: rows.map((r) => r.months) }]} />
    </ChartShell>
  );
}

/** ApexCharts area — portfolio trend with zoom / pan / series toggle. */
export function PortfolioSeriesChart({
  rows,
}: {
  rows: {
    periodEnd: string;
    cashSum: number | null;
    revenueSum: number | null;
    burnSum: number | null;
    cashN: number;
    revenueN: number;
    burnN: number;
  }[];
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  const data = rows
    .filter((r) => r.cashSum != null || r.revenueSum != null || r.burnSum != null)
    .map((r) => ({
      period: fmtChartPeriod(r.periodEnd),
      cash: r.cashSum,
      revenue: r.revenueSum,
      burn: r.burnSum,
      cashN: r.cashN,
      revenueN: r.revenueN,
      burnN: r.burnN,
    }));
  if (data.length < 2) return <ChartEmpty label="Need at least two booked periods for a trend." />;

  const base = apexBookBase(reduce);
  const options: ApexOptions = withChartId(
    {
      ...base,
      chart: { ...base.chart, type: "area" },
      colors: [BOOK_CHART.forest, BOOK_CHART.limeDeep, BOOK_CHART.warn],
      stroke: { curve: "smooth", width: [2.5, 2.5, 2] },
      fill: {
        type: ["gradient", "gradient", "solid"],
        gradient: { shadeIntensity: 0.35, opacityFrom: 0.35, opacityTo: 0.04, stops: [0, 90, 100] },
        opacity: [1, 1, 0],
      },
      markers: { size: 0, hover: { size: 5 } },
      xaxis: {
        categories: data.map((d) => d.period),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: BOOK_CHART.muted, fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: BOOK_CHART.muted, fontSize: "11px" },
          formatter: (v) => fmtChartNum(v),
        },
      },
      tooltip: {
        ...base.tooltip,
        y: {
          formatter: (val, opts) => {
            if (val == null || Number.isNaN(val)) return "";
            const point = opts ?? { dataPointIndex: 0, seriesIndex: 0, w: { globals: { seriesNames: [] as string[] } } };
            const i = point.dataPointIndex ?? 0;
            const seriesIndex = point.seriesIndex ?? 0;
            const seriesName = String(point.w?.globals?.seriesNames?.[seriesIndex] ?? "");
            const n = seriesName.startsWith("Cash")
              ? data[i]?.cashN
              : seriesName.startsWith("Revenue")
                ? data[i]?.revenueN
                : data[i]?.burnN;
            return `${fmtChartNum(val)} · ${n ?? 0} cos`;
          },
        },
      },
    },
    chartId,
  );

  return (
    <ChartShell
      chartId={chartId}
      filename="portfolio-trend"
      label="Portfolio booked series"
      foot={
        <p className="chart-foot">
          Drag to zoom · double-click to reset. Legend toggles series. Sums only include companies with a
          booked value that period — missing is not zero.
        </p>
      }
    >
      <ApexChart
        type="area"
        height={280}
        options={options}
        series={[
          { name: "Cash Σ", data: data.map((d) => d.cash) },
          { name: "Revenue Σ", data: data.map((d) => d.revenue) },
          { name: "Burn Σ", data: data.map((d) => d.burn) },
        ]}
      />
    </ChartShell>
  );
}

/** ApexCharts multi-line — company booked history. */
export function CompanyMetricHistoryChart({
  points,
}: {
  points: { periodEnd: string; cash: number | null; burn: number | null; revenue: number | null }[];
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  const hasSeries = points.filter((d) => d.cash != null || d.burn != null || d.revenue != null).length >= 2;
  if (!hasSeries) return <ChartEmpty label="Need at least two booked periods for a company trend." />;

  const base = apexBookBase(reduce);
  const options: ApexOptions = withChartId(
    {
      ...base,
      chart: { ...base.chart, type: "area" },
      colors: [BOOK_CHART.forest, BOOK_CHART.limeDeep, BOOK_CHART.warn],
      stroke: { curve: "smooth", width: [2.5, 2.5, 2], dashArray: [0, 0, 5] },
      fill: {
        type: ["gradient", "gradient", "solid"],
        gradient: { shadeIntensity: 0.3, opacityFrom: 0.28, opacityTo: 0.03, stops: [0, 90, 100] },
        opacity: [1, 1, 0],
      },
      markers: { size: 3, hover: { size: 6 } },
      xaxis: {
        categories: points.map((p) => fmtChartPeriod(p.periodEnd)),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: BOOK_CHART.muted, fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: BOOK_CHART.muted, fontSize: "11px" },
          formatter: (v) => fmtChartNum(v),
        },
      },
    },
    chartId,
  );

  return (
    <ChartShell
      chartId={chartId}
      filename="company-metric-history"
      label="Company metric history"
      foot={
        <p className="chart-foot">
          Drag to zoom · double-click to reset. Legend toggles series. Gaps stay blank.
        </p>
      }
    >
      <ApexChart
        type="area"
        height={260}
        options={options}
        series={[
          { name: "Cash", data: points.map((p) => p.cash) },
          { name: "Revenue", data: points.map((p) => p.revenue) },
          { name: "Burn", data: points.map((p) => p.burn) },
        ]}
      />
    </ChartShell>
  );
}

/** ApexCharts grouped columns — fund operating rollup. */
export function FundRollupBars({
  rows,
}: {
  rows: { fundName: string; cashSum: number | null; burnSum: number | null; revenueSum: number | null }[];
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  const filtered = rows.filter((r) => r.cashSum != null || r.burnSum != null || r.revenueSum != null);
  if (filtered.length === 0) return <ChartEmpty label="No fund rollup figures to chart." />;

  const base = apexBookBase(reduce);
  const options: ApexOptions = withChartId(
    {
      ...base,
      chart: { ...base.chart, type: "bar" },
      colors: [BOOK_CHART.forest, BOOK_CHART.limeDeep, BOOK_CHART.slate],
      plotOptions: {
        bar: { borderRadius: 4, columnWidth: "55%" },
      },
      xaxis: {
        categories: filtered.map((r) => (r.fundName.length > 16 ? `${r.fundName.slice(0, 14)}…` : r.fundName)),
        labels: { style: { colors: BOOK_CHART.muted, fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: BOOK_CHART.muted, fontSize: "11px" },
          formatter: (v) => fmtChartNum(v),
        },
      },
      tooltip: {
        ...base.tooltip,
        y: { formatter: (val) => (val == null ? "" : fmtChartNum(val)) },
      },
    },
    chartId,
  );

  return (
    <ChartShell
      chartId={chartId}
      filename="fund-rollup"
      label="Fund operating rollup"
      foot={<p className="chart-foot">Drag to zoom · double-click to reset. Booked rollups only.</p>}
    >
      <ApexChart
        type="bar"
        height={240}
        options={options}
        series={[
          { name: "Cash Σ", data: filtered.map((r) => r.cashSum) },
          { name: "Revenue Σ", data: filtered.map((r) => r.revenueSum) },
          { name: "Burn Σ", data: filtered.map((r) => r.burnSum) },
        ]}
      />
    </ChartShell>
  );
}

/** ApexCharts peer bars — ranked compare with data labels + export. */
export function ComparePeerBars({
  rows,
  metricLabel,
  unitHint,
}: {
  rows: { name: string; value: number; periodEnd?: string | null }[];
  metricLabel: string;
  unitHint?: string;
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  if (rows.length === 0) {
    return <ChartEmpty label={`No booked ${metricLabel.toLowerCase()} among selected peers.`} />;
  }

  const sorted = [...rows].sort((a, b) => b.value - a.value).slice(0, 12);
  const height = Math.max(220, sorted.length * 32 + 72);
  const unit = unitHint ? ` ${unitHint}` : "";
  const base = apexBarToolbar(reduce);

  const options: ApexOptions = withChartId(
    {
      ...base,
      colors: [BOOK_CHART.forest],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: "68%",
          dataLabels: { position: "top" },
        },
      },
      dataLabels: {
        enabled: true,
        offsetX: 28,
        style: { colors: [BOOK_CHART.muted], fontSize: "11px", fontWeight: 500 },
        formatter: (val) => (val == null ? "" : `${fmtChartNum(Number(val))}${unit}`),
      },
      xaxis: {
        categories: sorted.map((r) => (r.name.length > 16 ? `${r.name.slice(0, 14)}…` : r.name)),
        labels: {
          style: { colors: BOOK_CHART.muted, fontSize: "11px" },
          formatter: (v) => fmtChartNum(Number(v)),
        },
      },
      yaxis: {
        labels: { style: { colors: BOOK_CHART.muted, fontSize: "11px" }, maxWidth: 120 },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (val, opts) => {
            const idx = opts?.dataPointIndex ?? 0;
            const row = sorted[idx];
            const when = row?.periodEnd ? ` · ${fmtChartPeriod(row.periodEnd)}` : "";
            return `${fmtChartNum(Number(val))}${unit}${when}`;
          },
          title: { formatter: () => metricLabel },
        },
        x: {
          formatter: (_val, opts) => {
            const idx = opts?.dataPointIndex ?? 0;
            return sorted[idx]?.name ?? metricLabel;
          },
        },
      },
    },
    chartId,
  );

  return (
    <ChartShell
      chartId={chartId}
      filename={`${metricLabel.toLowerCase().replace(/\s+/g, "-")}-peers`}
      label={`${metricLabel} by peer`}
      foot={
        <p className="chart-foot">
          Booked facts only
          {rows.length > 12 ? ` (top 12 of ${rows.length})` : ""}. Drag to zoom · double-click to reset.
        </p>
      }
    >
      <ApexChart
        type="bar"
        height={height}
        options={options}
        series={[{ name: metricLabel, data: sorted.map((r) => r.value) }]}
      />
    </ChartShell>
  );
}

/**
 * ApexCharts radar — peer fingerprints across metrics (0–100 within the selected set).
 * Selecting different peers changes the shapes; this is the point of peer pick.
 */
export function ComparePeerRadar({
  peers,
  metricKeys,
  metricLabels,
}: {
  peers: { name: string; values: Record<string, number | null> }[];
  metricKeys: string[];
  metricLabels: Record<string, string>;
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  const axes = metricKeys.filter((k) => peers.some((p) => p.values[k] != null));
  if (peers.length < 2 || axes.length < 3) {
    return (
      <ChartEmpty label="Select at least two peers with three booked metrics for a fingerprint radar." />
    );
  }

  const shown = peers.slice(0, 6);
  const ranges = Object.fromEntries(
    axes.map((k) => {
      const nums = shown.map((p) => p.values[k]).filter((v): v is number => v != null && Number.isFinite(v));
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      return [k, { min, max: max === min ? min + 1 : max }];
    }),
  ) as Record<string, { min: number; max: number }>;

  const series = shown.map((p) => ({
    name: p.name.length > 18 ? `${p.name.slice(0, 16)}…` : p.name,
    data: axes.map((k) => {
      const v = p.values[k];
      if (v == null || !Number.isFinite(v)) return 0;
      const { min, max } = ranges[k]!;
      return Math.round(((v - min) / (max - min)) * 100);
    }),
  }));

  const base = apexRadarBase(reduce);
  const options: ApexOptions = withChartId(
    {
      ...base,
      colors: shown.map((_, i) => peerColor(i)),
      xaxis: {
        categories: axes.map((k) => metricLabels[k] ?? k.replaceAll("_", " ")),
        labels: { style: { colors: Array(axes.length).fill(BOOK_CHART.muted), fontSize: "11px" } },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (val, opts) => {
            const axis = axes[opts?.dataPointIndex ?? 0];
            const peer = shown[opts?.seriesIndex ?? 0];
            const raw = axis && peer ? peer.values[axis] : null;
            const label = axis ? (metricLabels[axis] ?? axis) : "";
            if (raw == null) return `${label}: not booked`;
            return `${label}: ${fmtChartNum(raw)} (index ${fmtChartNum(Number(val))})`;
          },
        },
      },
    },
    chartId,
  );

  return (
    <ChartShell
      chartId={chartId}
      filename="peer-radar"
      label="Peer metric fingerprints"
      foot={
        <p className="chart-foot">
          Each axis is scaled 0–100 within the selected peers (not absolute units). Toggle peers to reshape the
          fingerprints
          {peers.length > 6 ? ` · showing 6 of ${peers.length}` : ""}.
        </p>
      }
    >
      <ApexChart type="radar" height={340} options={options} series={series} />
    </ChartShell>
  );
}

/** ApexCharts vertical columns — primary metric for selected peers. */
export function ComparePeerColumns({
  rows,
  metricLabel,
  unitHint,
}: {
  rows: { name: string; value: number; periodEnd?: string | null }[];
  metricLabel: string;
  unitHint?: string;
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  if (rows.length === 0) {
    return <ChartEmpty label={`No booked ${metricLabel.toLowerCase()} among selected peers.`} />;
  }

  const sorted = [...rows].sort((a, b) => b.value - a.value).slice(0, 14);
  const unit = unitHint ? ` ${unitHint}` : "";
  const base = apexBarToolbar(reduce);
  const options: ApexOptions = withChartId(
    {
      ...base,
      colors: sorted.map((_, i) => peerColor(i)),
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: "55%",
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      xaxis: {
        categories: sorted.map((r) => (r.name.length > 12 ? `${r.name.slice(0, 10)}…` : r.name)),
        labels: { style: { colors: BOOK_CHART.muted, fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: BOOK_CHART.muted, fontSize: "11px" },
          formatter: (v) => fmtChartNum(v),
        },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (val, opts) => {
            const row = sorted[opts?.dataPointIndex ?? 0];
            const when = row?.periodEnd ? ` · ${fmtChartPeriod(row.periodEnd)}` : "";
            return `${fmtChartNum(Number(val))}${unit}${when}`;
          },
          title: { formatter: () => metricLabel },
        },
        x: {
          formatter: (_val, opts) => sorted[opts?.dataPointIndex ?? 0]?.name ?? metricLabel,
        },
      },
    },
    chartId,
  );

  return (
    <ChartShell
      chartId={chartId}
      filename={`${metricLabel.toLowerCase().replace(/\s+/g, "-")}-columns`}
      label={`${metricLabel} columns`}
      foot={
        <p className="chart-foot">
          Drag to zoom · double-click to reset. Selected peers only · booked {metricLabel.toLowerCase()}
          {rows.length > 14 ? ` (top 14 of ${rows.length})` : ""}.
        </p>
      }
    >
      <ApexChart
        type="bar"
        height={280}
        options={options}
        series={[{ name: metricLabel, data: sorted.map((r) => r.value) }]}
      />
    </ChartShell>
  );
}

/**
 * ApexCharts bubble — two axes for position, third booked metric for size
 * (e.g. cash × runway, size = burn). Missing size uses a small floor — never invented.
 */
export function ComparePeerScatter({
  rows,
  xLabel,
  yLabel,
  zLabel,
  xUnit,
  yUnit,
  zUnit,
}: {
  rows: { name: string; x: number; y: number; z: number | null }[];
  xLabel: string;
  yLabel: string;
  zLabel?: string;
  xUnit?: string;
  yUnit?: string;
  zUnit?: string;
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  if (rows.length < 2) {
    return <ChartEmpty label={`Need two peers with booked ${xLabel.toLowerCase()} and ${yLabel.toLowerCase()}.`} />;
  }

  const sizeLabel = zLabel ?? "Size";
  const bookedZ = rows.map((r) => r.z).filter((z): z is number => z != null && Number.isFinite(z) && z > 0);
  const zFloor = bookedZ.length ? Math.min(...bookedZ) * 0.35 : 1;
  const base = apexBubbleBase(reduce);
  const xu = xUnit ? ` ${xUnit}` : "";
  const yu = yUnit ? ` ${yUnit}` : "";
  const zu = zUnit ? ` ${zUnit}` : "";

  const options: ApexOptions = withChartId(
    {
      ...base,
      colors: rows.map((_, i) => peerColor(i)),
      xaxis: {
        type: "numeric",
        title: { text: xLabel, style: { color: BOOK_CHART.muted, fontSize: "11px" } },
        labels: { style: { colors: BOOK_CHART.muted, fontSize: "11px" }, formatter: (v) => fmtChartNum(Number(v)) },
        tickAmount: 5,
      },
      yaxis: {
        title: { text: yLabel, style: { color: BOOK_CHART.muted, fontSize: "11px" } },
        labels: { style: { colors: BOOK_CHART.muted, fontSize: "11px" }, formatter: (v) => fmtChartNum(Number(v)) },
      },
      tooltip: {
        theme: "light",
        shared: false,
        intersect: true,
        custom: ({ seriesIndex }) => {
          const row = rows[seriesIndex ?? 0];
          if (!row) return "";
          const sizeLine =
            row.z != null && Number.isFinite(row.z)
              ? `${sizeLabel} ${fmtChartNum(row.z)}${zu}`
              : `${sizeLabel} not booked`;
          return `<div class="apex-bubble-tip"><strong>${row.name}</strong><br/>${xLabel} ${fmtChartNum(row.x)}${xu}<br/>${yLabel} ${fmtChartNum(row.y)}${yu}<br/>${sizeLine}</div>`;
        },
      },
    },
    chartId,
  );

  const series = rows.map((r) => ({
    name: r.name,
    data: [
      {
        x: r.x,
        y: r.y,
        z: r.z != null && Number.isFinite(r.z) && r.z > 0 ? r.z : zFloor,
      },
    ],
  }));

  return (
    <ChartShell
      chartId={chartId}
      filename="peer-bubble"
      label={`${xLabel} vs ${yLabel}`}
      foot={
        <p className="chart-foot">
          Bubble size = booked {sizeLabel.toLowerCase()}
          {bookedZ.length < rows.length ? " (small floor when that metric is missing — never invented)" : ""}.
          Drag to zoom · double-click to reset.
        </p>
      }
    >
      <ApexChart type="bubble" height={420} options={options} series={series} />
    </ChartShell>
  );
}
