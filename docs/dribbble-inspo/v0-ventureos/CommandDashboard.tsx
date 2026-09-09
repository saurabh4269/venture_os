'use client';

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import {
  Building2,
  Flag,
  ShieldCheck,
  PieChart,
  Landmark,
  TrendingUp,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

/**
 * Command — Monday ritual KPI strip + Needs-a-look list.
 * Inspired by CashFlix + ecommerce + social analytics density.
 * Missing values render as — ; sparkline series are EXAMPLE-only placeholders.
 */

type SparkPoint = { t: string; v: number | null };

type Kpi = {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
  series?: SparkPoint[];
};

const EXAMPLE_SPARK: SparkPoint[] = [
  { t: "W1", v: 12 },
  { t: "W2", v: 14 },
  { t: "W3", v: 13 },
  { t: "W4", v: 16 },
  { t: "W5", v: 15 },
  { t: "W6", v: 18 },
];

const KPIS: Kpi[] = [
  {
    key: "companies",
    label: "Companies",
    value: "—",
    icon: <Building2 className="h-3.5 w-3.5" strokeWidth={1.5} />,
    series: EXAMPLE_SPARK,
  },
  {
    key: "toConfirm",
    label: "To confirm",
    value: "—",
    icon: <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
  {
    key: "flags",
    label: "Flags",
    value: "—",
    icon: <Flag className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
  {
    key: "coverage",
    label: "Coverage",
    value: "—",
    icon: <PieChart className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
  {
    key: "nav",
    label: "NAV",
    value: "—",
    icon: <Landmark className="h-3.5 w-3.5" strokeWidth={1.5} />,
    series: EXAMPLE_SPARK,
  },
  {
    key: "moic",
    label: "MOIC",
    value: "—",
    icon: <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
];

const NEEDS_LOOK = [
  { id: "ex-1", title: "EXAMPLE · MIS period gap", meta: "Filed metrics · cite pending" },
  { id: "ex-2", title: "EXAMPLE · Burn variance", meta: "Needs confirm before book write" },
  { id: "ex-3", title: "EXAMPLE · Source parse hold", meta: "Queued document" },
];

function Spark({ data }: { data: SparkPoint[] }) {
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cmdSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#09090B" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#09090B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="#09090B"
            strokeWidth={1.25}
            fill="url(#cmdSpark)"
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CommandDashboard() {
  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
              Command
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Monday ritual</h1>
          </div>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#09090B] px-3 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B]"
          >
            Confirm inbox
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {KPIS.map((k) => (
            <article
              key={k.key}
              className="rounded-lg border border-[#E4E4E7] bg-white p-3"
            >
              <div className="flex items-center justify-between text-[#71717A]">
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  {k.label}
                </span>
                {k.icon}
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                {k.value}
              </p>
              {k.series ? (
                <div className="mt-2">
                  <Spark data={k.series} />
                  <p className="mt-0.5 text-[10px] text-[#71717A]">EXAMPLE series</p>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-[#71717A]">No series</p>
              )}
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-[#E4E4E7] bg-white">
          <div className="flex items-center justify-between border-b border-[#E4E4E7] px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#71717A]" strokeWidth={1.5} />
              <h2 className="text-sm font-semibold">Needs a look</h2>
            </div>
            <span className="text-xs text-[#71717A]">Primary path → Confirm</span>
          </div>
          <ul className="divide-y divide-[#E4E4E7]">
            {NEEDS_LOOK.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{row.title}</p>
                  <p className="text-xs text-[#71717A]">{row.meta}</p>
                </div>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-[#E4E4E7] bg-[#FAFAFA] px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B]"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
