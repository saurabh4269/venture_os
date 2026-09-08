"use client";

/**
 * Book charts — Chart.js (canvas) + ApexCharts (SVG / sparklines).
 * Theme: `@/lib/chart-theme` (Vestberry-inspired screenshot + Chart.js / Apex docs).
 */
import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import type { ApexOptions } from "apexcharts";
import {
  BOOK_CHART,
  apexBarToolbar,
  apexBookBase,
  apexRadarBase,
  apexScatterBase,
  apexSparkline,
  doughnutOptions,
  fmtChartNum,
  fmtChartPeriod,
  groupedBarOptions,
  horizontalBarOptions,
  lineOptions,
  peerColor,
} from "@/lib/chart-theme";
import { IconDownload } from "@/components/Icons";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

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

/** Chart.js horizontal bars — cash by company. */
export function CashByCompanyChart({
  rows,
}: {
  rows: { name: string; cash: number; periodEnd: string }[];
}) {
  const reduce = useReduceMotion();
  if (rows.length === 0) return <ChartEmpty label="No booked cash to chart." />;

  const labels = rows.map((r) => (r.name.length > 16 ? `${r.name.slice(0, 14)}…` : r.name));
  const full = rows.map((r) => r.name);
  const periods = rows.map((r) => fmtChartPeriod(r.periodEnd));
  const height = Math.max(220, rows.length * 28 + 56);

  const options = useMemo(
    () =>
      horizontalBarOptions(reduce, {
        title: (items) => {
          const i = items[0]?.dataIndex ?? 0;
          return full[i] ?? "";
        },
        label: (ctx) => ` Cash ${fmtChartNum(Number(ctx.raw))} · as of ${periods[ctx.dataIndex] ?? ""}`,
      }),
    [reduce, full, periods],
  );

  return (
    <div className="chart-frame chart-frame-js" style={{ height }} aria-label="Cash by company">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: rows.map((r) => r.cash),
              backgroundColor: BOOK_CHART.forest,
              hoverBackgroundColor: BOOK_CHART.limeDeep,
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 18,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

function runwayBarColor(months: number) {
  if (months < 6) return BOOK_CHART.danger;
  if (months < 12) return BOOK_CHART.warn;
  return BOOK_CHART.forest;
}

/** Chart.js horizontal bars — runway months by company (booked cash ÷ burn only). */
export function RunwayByCompanyChart({
  rows,
}: {
  rows: { name: string; months: number; periodEnd: string }[];
}) {
  const reduce = useReduceMotion();
  if (rows.length === 0) return <ChartEmpty label="No runway to chart — need booked cash and burn." />;

  const labels = rows.map((r) => (r.name.length > 16 ? `${r.name.slice(0, 14)}…` : r.name));
  const full = rows.map((r) => r.name);
  const periods = rows.map((r) => fmtChartPeriod(r.periodEnd));
  const height = Math.max(220, rows.length * 28 + 56);
  const colors = rows.map((r) => runwayBarColor(r.months));

  const options = useMemo(
    () =>
      horizontalBarOptions(reduce, {
        title: (items) => {
          const i = items[0]?.dataIndex ?? 0;
          return full[i] ?? "";
        },
        label: (ctx) => {
          const mo = Number(ctx.raw);
          return ` ${fmtChartNum(mo)} mo · as of ${periods[ctx.dataIndex] ?? ""}`;
        },
      }),
    [reduce, full, periods],
  );

  return (
    <div className="chart-frame chart-frame-js" style={{ height }} aria-label="Runway by company">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: rows.map((r) => r.months),
              backgroundColor: colors,
              hoverBackgroundColor: colors,
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 18,
            },
          ],
        }}
        options={options}
      />
    </div>
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
          Zoom or pan the trend. Legend toggles series. Sums only include companies with a booked value that
          period — missing is not zero.
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

/** Chart.js multi-line — company booked history. */
export function CompanyMetricHistoryChart({
  points,
}: {
  points: { periodEnd: string; cash: number | null; burn: number | null; revenue: number | null }[];
}) {
  const reduce = useReduceMotion();
  const labels = points.map((p) => fmtChartPeriod(p.periodEnd));
  const hasSeries = points.filter((d) => d.cash != null || d.burn != null || d.revenue != null).length >= 2;
  if (!hasSeries) return <ChartEmpty label="Need at least two booked periods for a company trend." />;

  const options = useMemo(
    () =>
      lineOptions(reduce, (ctx) => {
        const v = ctx.parsed.y;
        if (v == null) return ` ${ctx.dataset.label}: `;
        return ` ${ctx.dataset.label}: ${fmtChartNum(v)}`;
      }),
    [reduce],
  );

  return (
    <div className="chart-frame chart-frame-js" style={{ height: 260 }} aria-label="Company metric history">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Cash",
              data: points.map((p) => p.cash),
              borderColor: BOOK_CHART.forest,
              backgroundColor: BOOK_CHART.forest,
              tension: 0.25,
              pointRadius: 3,
              pointHoverRadius: 6,
              borderWidth: 2.2,
              spanGaps: false,
            },
            {
              label: "Revenue",
              data: points.map((p) => p.revenue),
              borderColor: BOOK_CHART.limeDeep,
              backgroundColor: BOOK_CHART.limeDeep,
              tension: 0.25,
              pointRadius: 3,
              pointHoverRadius: 6,
              borderWidth: 2.2,
              spanGaps: false,
            },
            {
              label: "Burn",
              data: points.map((p) => p.burn),
              borderColor: BOOK_CHART.warn,
              backgroundColor: BOOK_CHART.warn,
              tension: 0.25,
              pointRadius: 0,
              pointHoverRadius: 5,
              borderWidth: 2,
              borderDash: [4, 3],
              spanGaps: false,
            },
          ],
        }}
        options={options}
      />
      <p className="chart-foot">Click a legend item to hide a series. Gaps stay blank.</p>
    </div>
  );
}

/** Chart.js grouped columns — fund operating rollup. */
export function FundRollupBars({
  rows,
}: {
  rows: { fundName: string; cashSum: number | null; burnSum: number | null; revenueSum: number | null }[];
}) {
  const reduce = useReduceMotion();
  const filtered = rows.filter((r) => r.cashSum != null || r.burnSum != null || r.revenueSum != null);
  if (filtered.length === 0) return <ChartEmpty label="No fund rollup figures to chart." />;

  const labels = filtered.map((r) => (r.fundName.length > 16 ? `${r.fundName.slice(0, 14)}…` : r.fundName));
  const options = useMemo(
    () =>
      groupedBarOptions(reduce, (ctx) => {
        const v = ctx.parsed.y;
        if (v == null) return ` ${ctx.dataset.label}: `;
        return ` ${ctx.dataset.label}: ${fmtChartNum(v)}`;
      }),
    [reduce],
  );

  return (
    <div className="chart-frame chart-frame-js" style={{ height: 240 }} aria-label="Fund operating rollup">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: "Cash Σ",
              data: filtered.map((r) => r.cashSum),
              backgroundColor: BOOK_CHART.forest,
              borderRadius: 4,
              maxBarThickness: 28,
            },
            {
              label: "Revenue Σ",
              data: filtered.map((r) => r.revenueSum),
              backgroundColor: BOOK_CHART.limeDeep,
              borderRadius: 4,
              maxBarThickness: 28,
            },
            {
              label: "Burn Σ",
              data: filtered.map((r) => r.burnSum),
              backgroundColor: BOOK_CHART.slate,
              borderRadius: 4,
              maxBarThickness: 28,
            },
          ],
        }}
        options={options}
      />
    </div>
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
          {rows.length > 12 ? ` (top 12 of ${rows.length})` : ""}. Absent values stay off the chart.
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

/** Chart.js vertical columns — primary metric for selected peers (distinct colors). */
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
  if (rows.length === 0) {
    return <ChartEmpty label={`No booked ${metricLabel.toLowerCase()} among selected peers.`} />;
  }

  const sorted = [...rows].sort((a, b) => b.value - a.value).slice(0, 14);
  const unit = unitHint ? ` ${unitHint}` : "";
  const labels = sorted.map((r) => (r.name.length > 12 ? `${r.name.slice(0, 10)}…` : r.name));
  const options = useMemo(
    () =>
      groupedBarOptions(reduce, (ctx) => {
        const row = sorted[ctx.dataIndex];
        const when = row?.periodEnd ? ` · ${fmtChartPeriod(row.periodEnd)}` : "";
        return ` ${fmtChartNum(Number(ctx.raw))}${unit}${when}`;
      }),
    [reduce, sorted, unit],
  );
  // Hide bottom legend — one series with colored bars
  const opts = useMemo(
    () =>
      ({
        ...options,
        plugins: {
          ...options.plugins,
          legend: { display: false },
          tooltip: {
            ...options.plugins?.tooltip,
            callbacks: {
              title: (items: { dataIndex?: number }[]) => sorted[items[0]?.dataIndex ?? 0]?.name ?? metricLabel,
              label: (ctx: { raw: unknown }) => ` ${fmtChartNum(Number(ctx.raw))}${unit}`,
            },
          },
        },
      }) as typeof options,
    [options, sorted, metricLabel, unit],
  );

  return (
    <div className="chart-frame chart-frame-js" style={{ height: 280 }} aria-label={`${metricLabel} columns`}>
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: metricLabel,
              data: sorted.map((r) => r.value),
              backgroundColor: sorted.map((_, i) => peerColor(i)),
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 36,
            },
          ],
        }}
        options={opts}
      />
      <p className="chart-foot">
        Selected peers only · booked {metricLabel.toLowerCase()}
        {rows.length > 14 ? ` (top 14 of ${rows.length})` : ""}.
      </p>
    </div>
  );
}

/** ApexCharts scatter — two metrics for selected peers (e.g. cash × runway). */
export function ComparePeerScatter({
  rows,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
}: {
  rows: { name: string; x: number; y: number }[];
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
}) {
  const reduce = useReduceMotion();
  const chartId = useApexChartId();
  if (rows.length < 2) {
    return <ChartEmpty label={`Need two peers with booked ${xLabel.toLowerCase()} and ${yLabel.toLowerCase()}.`} />;
  }

  const base = apexScatterBase(reduce);
  const xu = xUnit ? ` ${xUnit}` : "";
  const yu = yUnit ? ` ${yUnit}` : "";
  const options: ApexOptions = withChartId(
    {
      ...base,
      colors: rows.map((_, i) => peerColor(i)),
      xaxis: {
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
        y: {
          formatter: (val, opts) => {
            const row = rows[opts?.seriesIndex ?? 0];
            if (!row) return fmtChartNum(Number(val));
            return `${xLabel} ${fmtChartNum(row.x)}${xu} · ${yLabel} ${fmtChartNum(row.y)}${yu}`;
          },
        },
      },
    },
    chartId,
  );

  // One series per peer so colors / legend stay distinct
  const series = rows.map((r) => ({
    name: r.name,
    data: [[r.x, r.y]],
  }));

  return (
    <ChartShell
      chartId={chartId}
      filename="peer-scatter"
      label={`${xLabel} vs ${yLabel}`}
      foot={
        <p className="chart-foot">
          Each point is a selected peer. Zoom to cluster. Missing either axis stays off the plot.
        </p>
      }
    >
      <ApexChart type="scatter" height={300} options={options} series={series} />
    </ChartShell>
  );
}
