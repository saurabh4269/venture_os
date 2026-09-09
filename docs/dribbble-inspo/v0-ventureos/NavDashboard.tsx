'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Landmark, Percent, TrendingUp, Waves } from "lucide-react";

/**
 * NAV — Cost / NAV / MOIC / IRR cards, NAV area, waterfall-like bridge, mark form stub.
 * Inspired by CashFlix net-worth hierarchy + data-viz waterfall/area patterns.
 */

type NavPoint = { period: string; nav: number | null };

const EXAMPLE_NAV: NavPoint[] = [
  { period: "Q1", nav: 100 },
  { period: "Q2", nav: 108 },
  { period: "Q3", nav: 112 },
  { period: "Q4", nav: 118 },
  { period: "Q5", nav: null },
  { period: "Q6", nav: 124 },
];

const EXAMPLE_BRIDGE = [
  { step: "Opening", value: 100, fill: "#09090B" },
  { step: "Calls", value: 12, fill: "#059669" },
  { step: "Marks", value: 8, fill: "#059669" },
  { step: "Exits", value: -6, fill: "#71717A" },
  { step: "Closing", value: 114, fill: "#09090B" },
];

const CARDS = [
  { label: "Cost", value: "—", icon: Landmark },
  { label: "NAV", value: "—", icon: Waves },
  { label: "MOIC", value: "—", icon: TrendingUp },
  { label: "IRR", value: "—", icon: Percent },
];

export default function NavDashboard() {
  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
            NAV
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Fund bridge</h1>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CARDS.map(({ label, value, icon: Icon }) => (
            <article
              key={label}
              className="rounded-lg border border-[#E4E4E7] bg-white p-4"
            >
              <div className="flex items-center justify-between text-[#71717A]">
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  {label}
                </span>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-5">
          <section className="rounded-lg border border-[#E4E4E7] bg-white p-4 lg:col-span-3">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">NAV over time</h2>
              <span className="text-[10px] text-[#71717A]">EXAMPLE · null = gap</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={EXAMPLE_NAV} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#09090B" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#09090B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E4E4E7" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: "#71717A", fontSize: 11 }} axisLine={{ stroke: "#E4E4E7" }} tickLine={false} />
                  <YAxis tick={{ fill: "#71717A", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ border: "1px solid #E4E4E7", borderRadius: 8, fontSize: 12, background: "#FFFFFF" }} />
                  <Area type="monotone" dataKey="nav" stroke="#09090B" strokeWidth={1.5} fill="url(#navFill)" connectNulls={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border border-[#E4E4E7] bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Bridge</h2>
              <span className="text-[10px] text-[#71717A]">Waterfall-like · EXAMPLE</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={EXAMPLE_BRIDGE} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#E4E4E7" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="step" tick={{ fill: "#71717A", fontSize: 10 }} axisLine={{ stroke: "#E4E4E7" }} tickLine={false} />
                  <YAxis tick={{ fill: "#71717A", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={{ border: "1px solid #E4E4E7", borderRadius: 8, fontSize: 12, background: "#FFFFFF" }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {EXAMPLE_BRIDGE.map((entry) => (
                      <Cell key={entry.step} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-[#E4E4E7] bg-white p-4">
          <h2 className="text-sm font-semibold">Mark form</h2>
          <p className="mt-1 text-xs text-[#71717A]">
            Stub only — Confirm owns writes. No auto-commit.
          </p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <label className="block text-xs font-medium text-[#71717A]">
              Company
              <input
                className="mt-1 w-full rounded-md border border-[#E4E4E7] bg-[#FAFAFA] px-2.5 py-2 text-sm text-[#09090B] outline-none focus:border-[#09090B]"
                placeholder="EXAMPLE Co"
                defaultValue=""
              />
            </label>
            <label className="block text-xs font-medium text-[#71717A]">
              Fair value
              <input
                className="mt-1 w-full rounded-md border border-[#E4E4E7] bg-[#FAFAFA] px-2.5 py-2 text-sm text-[#09090B] outline-none focus:border-[#09090B]"
                placeholder="—"
                inputMode="decimal"
              />
            </label>
            <label className="block text-xs font-medium text-[#71717A]">
              As of
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-[#E4E4E7] bg-[#FAFAFA] px-2.5 py-2 text-sm text-[#09090B] outline-none focus:border-[#09090B]"
              />
            </label>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="cursor-pointer rounded-md bg-[#09090B] px-3 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B]"
              >
                Queue for Confirm
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
