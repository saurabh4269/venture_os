'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Banknote, Flame, Timer } from "lucide-react";

/**
 * Company detail — cash / burn / runway (months) cards + booked trend LineChart.
 * Null gap in series is intentional (missing != 0). EXAMPLE labels only.
 */

type Point = { period: string; booked: number | null };

/** Mid series null creates a visible gap when connectNulls={false}. */
const EXAMPLE_BOOKED: Point[] = [
  { period: "Jan", booked: 2.1 },
  { period: "Feb", booked: 2.4 },
  { period: "Mar", booked: 2.3 },
  { period: "Apr", booked: null },
  { period: "May", booked: 2.8 },
  { period: "Jun", booked: 3.0 },
];

const METRICS = [
  { label: "Cash", value: "—", icon: Banknote, hint: "Filed balance" },
  { label: "Burn", value: "—", icon: Flame, hint: "Net monthly" },
  { label: "Runway", value: "—", icon: Timer, hint: "Months" },
];

export default function CompanyDetail() {
  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
            Company
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">EXAMPLE Co</h1>
          <p className="mt-1 text-xs text-[#71717A]">Scaffold · not a real portfolio row</p>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {METRICS.map(({ label, value, icon: Icon, hint }) => (
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
              <p className="mt-1 text-[11px] text-[#71717A]">
                {hint}
                {label === "Runway" ? " · labeled months" : ""}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-[#E4E4E7] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Booked trend</h2>
            <span className="text-[10px] text-[#71717A]">
              {/* Null gap: Apr is null — Line must not connect across missing MIS */}
              EXAMPLE · null gap at Apr (connectNulls=false)
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={EXAMPLE_BOOKED} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E4E4E7" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "#71717A", fontSize: 11 }}
                  axisLine={{ stroke: "#E4E4E7" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#71717A", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #E4E4E7",
                    borderRadius: 8,
                    fontSize: 12,
                    background: "#FFFFFF",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="booked"
                  stroke="#09090B"
                  strokeWidth={1.5}
                  dot={{ r: 3, fill: "#09090B" }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
