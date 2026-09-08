"use client";

/**
 * Book charts — Chart.js (canvas) + ApexCharts (SVG / sparklines).
 * Theme: `@/lib/chart-theme` (Vestberry-inspired screenshot + Chart.js / Apex docs).
 */
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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
  apexSparkline,
  doughnutOptions,
  fmtChartNum,
  fmtChartPeriod,
  groupedBarOptions,
  horizontalBarOptions,
  lineOptions,
} from "@/lib/chart-theme";

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

/** Chart.js donut + Vestberry-style side legend. */
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
  if (slices.length === 0) return <ChartEmpty label="No companies to chart." />;

  const total = slices.reduce((s, d) => s + d.value, 0);
  const options = useMemo(
    () =>
      doughnutOptions(reduce, (ctx) => {
        const v = Number(ctx.raw ?? 0);
        const pct = total ? Math.round((v / total) * 100) : 0;
        return ` ${ctx.label}: ${fmtChartNum(v)} (${pct}%)`;
      }),
    [reduce, total],
  );

  return (
    <div className="chart-donut-split" aria-label="Coverage mix">
      <div className="chart-frame chart-frame-js chart-donut-canvas">
        <Doughnut
          data={{
            labels: slices.map((s) => s.name),
            datasets: [
              {
                data: slices.map((s) => s.value),
                backgroundColor: slices.map((s) => s.color),
                borderWidth: 0,
                hoverOffset: 6,
              },
            ],
          }}
          options={options}
        />
      </div>
      <ul className="chart-side-legend">
        {slices.map((s) => {
          const pct = total ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.name}>
              <span className="chart-side-dot" style={{ background: s.color }} />
              <span className="chart-side-copy">
                <strong>{s.name}</strong>
                <span className="lede">
                  {fmtChartNum(s.value)} names · {pct}%
                </span>
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
  const options: ApexOptions = {
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
  };

  return (
    <div className="chart-frame chart-frame-apex" aria-label="Portfolio booked series">
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
      <p className="chart-foot">
        Zoom or pan the trend. Legend toggles series. Sums only include companies with a booked value that
        period — missing is not zero.
      </p>
    </div>
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
  if (rows.length === 0) {
    return <ChartEmpty label={`No booked ${metricLabel.toLowerCase()} among selected peers.`} />;
  }

  const sorted = [...rows].sort((a, b) => b.value - a.value).slice(0, 12);
  const height = Math.max(220, sorted.length * 32 + 72);
  const unit = unitHint ? ` ${unitHint}` : "";
  const base = apexBarToolbar(reduce);

  const options: ApexOptions = {
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
  };

  return (
    <div className="chart-frame chart-frame-apex" aria-label={`${metricLabel} by peer`}>
      <ApexChart
        type="bar"
        height={height}
        options={options}
        series={[{ name: metricLabel, data: sorted.map((r) => r.value) }]}
      />
      <p className="chart-foot">
        Booked facts only
        {rows.length > 12 ? ` (top 12 of ${rows.length})` : ""}. Absent values stay off the chart.
      </p>
    </div>
  );
}
