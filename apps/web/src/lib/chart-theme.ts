/**
 * Book chart theme — Chart.js + ApexCharts.
 * Visual inspiration: image-references/Screenshot_2026-09-07_10_21_51.png
 * (Vestberry-style KPI sparklines, side-legend doughnuts, lime/teal palette).
 *
 * Libraries: https://www.chartjs.org/ · https://apexcharts.com/
 * Future charts: import helpers from here — do not invent ad-hoc colors or tooltip chrome.
 */
import type { ApexOptions } from "apexcharts";
import type { ChartOptions, TooltipItem } from "chart.js";

/** Vestberry-adjacent book palette (lime accent + deep teal). */
export const BOOK_CHART = {
  forest: "#0f2e28",
  forestSoft: "#3d6b5c",
  lime: "#c5f547",
  limeDeep: "#9ccc2e",
  slate: "#c8d4ce",
  warn: "#8a6a1a",
  danger: "#b42318",
  muted: "#5a6b64",
  rule: "#d0dbd5",
  ink: "#10221c",
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

const TIP = {
  backgroundColor: BOOK_CHART.paper,
  titleColor: BOOK_CHART.ink,
  bodyColor: BOOK_CHART.forest,
  borderColor: BOOK_CHART.rule,
  borderWidth: 1,
  cornerRadius: 8,
  padding: 10,
  displayColors: true,
  titleFont: { size: 12, weight: 600 as const, family: "inherit" },
  bodyFont: { size: 12, family: "inherit" },
};

const TICK = {
  color: BOOK_CHART.muted,
  font: { size: 11, family: "inherit" },
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
      tooltip: { ...TIP, callbacks: { label: onLabel } },
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
      tooltip: { ...TIP, callbacks: { title: opts.title, label: opts.label } },
    },
    scales: {
      x: {
        grid: { color: BOOK_CHART.rule },
        border: { display: false },
        ticks: { ...TICK, callback: (v) => fmtChartNum(Number(v)) },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: TICK,
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
          color: BOOK_CHART.muted,
          font: { size: 11, family: "inherit" },
          padding: 14,
        },
      },
      tooltip: { ...TIP, callbacks: { label: onLabel } },
    },
    scales: {
      x: {
        grid: { color: BOOK_CHART.rule },
        border: { display: false },
        ticks: TICK,
      },
      y: {
        grid: { color: BOOK_CHART.rule },
        border: { display: false },
        ticks: { ...TICK, callback: (v) => fmtChartNum(Number(v)) },
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
          color: BOOK_CHART.muted,
          font: { size: 11, family: "inherit" },
          padding: 14,
        },
      },
      tooltip: { ...TIP, callbacks: { label: onLabel } },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: TICK,
      },
      y: {
        grid: { color: BOOK_CHART.rule },
        border: { display: false },
        ticks: { ...TICK, callback: (v) => fmtChartNum(Number(v)) },
      },
    },
  } as ChartOptions<"bar">;
}

export function apexBookBase(reduceMotion: boolean): ApexOptions {
  return {
    chart: {
      toolbar: {
        show: true,
        offsetY: 0,
        tools: {
          download: false,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: { enabled: true, type: "x" },
      animations: { enabled: !reduceMotion, speed: 500 },
      fontFamily: "inherit",
      foreColor: BOOK_CHART.muted,
      background: "transparent",
    },
    grid: { borderColor: BOOK_CHART.rule, strokeDashArray: 4 },
    legend: {
      position: "bottom",
      fontSize: "11px",
      markers: { size: 5, shape: "circle" },
      itemMargin: { horizontal: 10 },
    },
    dataLabels: { enabled: false },
    tooltip: { theme: "light", shared: true, intersect: false },
  };
}

export function apexBarToolbar(reduceMotion: boolean): ApexOptions {
  return {
    chart: {
      type: "bar",
      toolbar: { show: false },
      animations: { enabled: !reduceMotion, speed: 450 },
      fontFamily: "inherit",
      foreColor: BOOK_CHART.muted,
      background: "transparent",
    },
    colors: [BOOK_CHART.forest],
    grid: {
      borderColor: BOOK_CHART.rule,
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: { theme: "light" },
  };
}

/** Distinct peer colors for compare (Apex distributed / Chart.js datasets). */
export const PEER_PALETTE = [
  BOOK_CHART.forest,
  BOOK_CHART.limeDeep,
  BOOK_CHART.forestSoft,
  "#2a6f97",
  "#bc6c25",
  "#6d597a",
  "#0077b6",
  "#9b2226",
  "#52796f",
  "#b08968",
  "#4a4e69",
  "#40916c",
] as const;

export function peerColor(i: number) {
  return PEER_PALETTE[i % PEER_PALETTE.length]!;
}

export function apexRadarBase(reduceMotion: boolean): ApexOptions {
  return {
    chart: {
      type: "radar",
      toolbar: { show: false },
      animations: { enabled: !reduceMotion, speed: 450 },
      fontFamily: "inherit",
      foreColor: BOOK_CHART.muted,
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
    tooltip: { theme: "light" },
    grid: { borderColor: BOOK_CHART.rule },
    yaxis: { show: false, max: 100, min: 0, tickAmount: 4 },
    plotOptions: {
      radar: {
        size: undefined,
        polygons: {
          strokeColors: BOOK_CHART.rule,
          connectorColors: BOOK_CHART.rule,
          fill: { colors: ["#f7faf8", "#ffffff"] },
        },
      },
    },
  };
}

export function apexScatterBase(reduceMotion: boolean): ApexOptions {
  return {
    chart: {
      type: "scatter",
      toolbar: {
        show: true,
        tools: {
          download: false,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: { enabled: true, type: "xy" },
      animations: { enabled: !reduceMotion, speed: 450 },
      fontFamily: "inherit",
      foreColor: BOOK_CHART.muted,
      background: "transparent",
    },
    grid: { borderColor: BOOK_CHART.rule, strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { theme: "light", shared: false, intersect: true },
    markers: { size: 9, strokeWidth: 2, strokeColors: "#fff", hover: { size: 11 } },
  };
}

/** Vestberry-style KPI sparkline (Apex sparkline + lime fill). */
export function apexSparkline(reduceMotion: boolean, color: string = String(BOOK_CHART.limeDeep)): ApexOptions {
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
      theme: "light",
      y: { formatter: (v) => (v == null ? "" : fmtChartNum(v)) },
    },
    markers: { size: 0, hover: { size: 4 } },
  };
}
