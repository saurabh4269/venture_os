/**
 * Book chart theme — Chart.js + ApexCharts.
 * Palette: Dribbble data-viz shots (Fitonist / CashFlix / Huthy / social analytics)
 * — violet, azure, coral, amber, mint. Not forest/lime.
 *
 * Libraries: https://www.chartjs.org/ · https://apexcharts.com/
 * Future charts: import helpers from here — do not invent ad-hoc colors or tooltip chrome.
 */
import type { ApexOptions } from "apexcharts";
import type { ChartOptions, TooltipItem } from "chart.js";

/** Colorful series palette. Legacy keys stay as aliases so existing charts remap. */
export const BOOK_CHART = {
  violet: "#7C5CFF",
  azure: "#2F80ED",
  coral: "#FF6B4A",
  amber: "#F5B942",
  mint: "#22C55E",
  magenta: "#E879F9",
  forest: "#7C5CFF",
  forestSoft: "#A78BFA",
  lime: "#F5B942",
  limeDeep: "#2F80ED",
  slate: "#C4B5FD",
  warn: "#F59E0B",
  danger: "#F43F5E",
  ok: "#22C55E",
  muted: "#6b6b6b",
  rule: "#e2e2e2",
  ink: "#111111",
  paper: "#ffffff",
} as const;

export function fmtChartPeriod(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return iso.slice(0, 7);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function fmtChartNum(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

/** Axis / tooltip chrome follows the book theme. Series colors stay in BOOK_CHART. */
export function chartChrome() {
  const dark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  return {
    muted: dark ? "#a3a3a3" : "#6b6b6b",
    ink: dark ? "#f5f5f5" : "#111111",
    paper: dark ? "#161616" : "#ffffff",
    rule: dark ? "#2a2a2a" : "#e2e2e2",
    tip: (dark ? "dark" : "light") as "dark" | "light",
  };
}

const TIP = () => {
  const c = chartChrome();
  return {
    backgroundColor: c.paper,
    titleColor: c.ink,
    bodyColor: c.ink,
    borderColor: c.rule,
    borderWidth: 1,
    cornerRadius: 8,
    padding: 10,
    displayColors: true,
    titleFont: { size: 12, weight: 600 as const, family: "inherit" },
    bodyFont: { size: 12, family: "inherit" },
  };
};

const TICK = () => {
  const c = chartChrome();
  return {
    color: c.muted,
    font: { size: 11, family: "inherit" },
  };
};

function motion(reduce: boolean) {
  return reduce ? false : { duration: 550 };
}

export function doughnutOptions(
  reduceMotion: boolean,
  onLabel: (ctx: TooltipItem<"doughnut">) => string | string[],
): ChartOptions<"doughnut"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "74%",
    animation: motion(reduceMotion),
    plugins: {
      legend: { display: false },
      tooltip: { ...TIP(), callbacks: { label: onLabel } },
    },
    layout: { padding: 4 },
  } as ChartOptions<"doughnut">;
}

export function horizontalBarOptions(
  reduceMotion: boolean,
  opts: {
    title: (items: TooltipItem<"bar">[]) => string | string[];
    label: (ctx: TooltipItem<"bar">) => string | string[];
  },
): ChartOptions<"bar"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    animation: motion(reduceMotion),
    plugins: {
      legend: { display: false },
      tooltip: { ...TIP(), callbacks: { title: opts.title, label: opts.label } },
    },
    scales: {
      x: {
        grid: { color: chartChrome().rule },
        border: { display: false },
        ticks: { ...TICK(), callback: (v) => fmtChartNum(Number(v)) },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: TICK(),
      },
    },
  } as ChartOptions<"bar">;
}

export function lineOptions(
  reduceMotion: boolean,
  onLabel: (ctx: TooltipItem<"line">) => string | string[],
): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: motion(reduceMotion),
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: "circle",
          color: chartChrome().muted,
          font: { size: 11, family: "inherit" },
          padding: 14,
        },
      },
      tooltip: { ...TIP(), callbacks: { label: onLabel } },
    },
    scales: {
      x: {
        grid: { color: chartChrome().rule },
        border: { display: false },
        ticks: TICK(),
      },
      y: {
        grid: { color: chartChrome().rule },
        border: { display: false },
        ticks: { ...TICK(), callback: (v) => fmtChartNum(Number(v)) },
      },
    },
  } as ChartOptions<"line">;
}

export function groupedBarOptions(
  reduceMotion: boolean,
  onLabel: (ctx: TooltipItem<"bar">) => string | string[],
): ChartOptions<"bar"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: motion(reduceMotion),
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: "circle",
          color: chartChrome().muted,
          font: { size: 11, family: "inherit" },
          padding: 14,
        },
      },
      tooltip: { ...TIP(), callbacks: { label: onLabel } },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: TICK(),
      },
      y: {
        grid: { color: chartChrome().rule },
        border: { display: false },
        ticks: { ...TICK(), callback: (v) => fmtChartNum(Number(v)) },
      },
    },
  } as ChartOptions<"bar">;
}

/**
 * Interactive Apex chrome: drag-to-zoom, no toolbar icons.
 * PNG export lives in ChartShell (single download control).
 * Double-click the plot to reset zoom.
 */
function apexZoomChrome(
  reduceMotion: boolean,
  zoomType: "x" | "xy" = "x",
): NonNullable<ApexOptions["chart"]> {
  return {
    toolbar: { show: false },
    zoom: { enabled: true, type: zoomType, autoScaleYaxis: true },
    selection: { enabled: true },
    animations: { enabled: !reduceMotion, speed: 500 },
    fontFamily: "inherit",
    foreColor: chartChrome().muted,
    background: "transparent",
  };
}

export function apexBookBase(reduceMotion: boolean): ApexOptions {
  const c = chartChrome();
  return {
    chart: apexZoomChrome(reduceMotion, "x"),
    grid: { borderColor: c.rule, strokeDashArray: 4 },
    legend: {
      position: "bottom",
      fontSize: "11px",
      markers: { size: 5, shape: "circle" },
      itemMargin: { horizontal: 10 },
    },
    dataLabels: { enabled: false },
    tooltip: { theme: c.tip, shared: true, intersect: false },
  };
}

export function apexBarToolbar(reduceMotion: boolean): ApexOptions {
  const c = chartChrome();
  return {
    chart: {
      ...apexZoomChrome(reduceMotion, "x"),
      type: "bar",
      animations: { enabled: !reduceMotion, speed: 450 },
    },
    colors: [BOOK_CHART.violet],
    grid: {
      borderColor: c.rule,
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: { theme: c.tip },
  };
}

/** Distinct peer colors for compare (Apex distributed / Chart.js datasets). */
export const PEER_PALETTE = [
  BOOK_CHART.violet,
  BOOK_CHART.azure,
  BOOK_CHART.coral,
  BOOK_CHART.amber,
  BOOK_CHART.mint,
  BOOK_CHART.magenta,
  "#06B6D4",
  "#F472B6",
  "#8B5CF6",
  "#FB7185",
  "#14B8A6",
  "#F97316",
] as const;

export function peerColor(i: number) {
  return PEER_PALETTE[i % PEER_PALETTE.length]!;
}

export function apexRadarBase(reduceMotion: boolean): ApexOptions {
  const c = chartChrome();
  return {
    chart: {
      type: "radar",
      toolbar: { show: false },
      animations: { enabled: !reduceMotion, speed: 450 },
      fontFamily: "inherit",
      foreColor: c.muted,
      background: "transparent",
    },
    stroke: { width: 2 },
    fill: { opacity: 0.18 },
    markers: { size: 3, hover: { size: 5 } },
    legend: {
      position: "bottom",
      fontSize: "11px",
      markers: { size: 5, shape: "circle" },
      itemMargin: { horizontal: 10 },
    },
    tooltip: { theme: c.tip },
    grid: { borderColor: c.rule },
    yaxis: { show: false, max: 100, min: 0, tickAmount: 4 },
    plotOptions: {
      radar: {
        size: undefined,
        polygons: {
          strokeColors: c.rule,
          connectorColors: c.rule,
          fill: { colors: [c.paper, c.paper] },
        },
      },
    },
  };
}

export function apexScatterBase(reduceMotion: boolean): ApexOptions {
  const c = chartChrome();
  return {
    chart: {
      ...apexZoomChrome(reduceMotion, "xy"),
      type: "scatter",
      animations: { enabled: !reduceMotion, speed: 450 },
    },
    grid: { borderColor: c.rule, strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { theme: c.tip, shared: false, intersect: true },
    markers: { size: 9, strokeWidth: 2, strokeColors: c.paper, hover: { size: 11 } },
  };
}

/** Peer bubble — x/y position + z radius from a third booked metric. */
export function apexBubbleBase(reduceMotion: boolean): ApexOptions {
  const c = chartChrome();
  return {
    chart: {
      ...apexZoomChrome(reduceMotion, "xy"),
      type: "bubble",
      animations: { enabled: !reduceMotion, speed: 450 },
    },
    grid: { borderColor: c.rule, strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { theme: c.tip, shared: false, intersect: true },
    dataLabels: { enabled: false },
    fill: { opacity: 0.78 },
    plotOptions: {
      bubble: {
        minBubbleRadius: 7,
        maxBubbleRadius: 32,
        zScaling: true,
      },
    },
  };
}

/** KPI sparkline — smooth area in the assigned series color. */
export function apexSparkline(reduceMotion: boolean, color: string = String(BOOK_CHART.violet)): ApexOptions {
  return {
    chart: {
      type: "area",
      sparkline: { enabled: true },
      animations: { enabled: !reduceMotion, speed: 400 },
      fontFamily: "inherit",
      background: "transparent",
    },
    stroke: { curve: "smooth", width: 2, colors: [color] },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.4,
        opacityFrom: 0.45,
        opacityTo: 0.02,
        stops: [0, 90, 100],
        colorStops: [
          { offset: 0, color, opacity: 0.45 },
          { offset: 100, color, opacity: 0.02 },
        ],
      },
    },
    colors: [color],
    tooltip: {
      enabled: true,
      theme: chartChrome().tip,
      y: { formatter: (v) => (v == null ? "" : fmtChartNum(v)) },
    },
    markers: { size: 0, hover: { size: 4 } },
  };
}
