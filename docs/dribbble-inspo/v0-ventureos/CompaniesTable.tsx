'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import { Building2 } from "lucide-react";

/**
 * Companies — dense table + row sparkline cells.
 * Inspired by social entity tables + ecommerce SKU density.
 */

type Spark = { t: string; v: number | null };

type Row = {
  id: string;
  name: string;
  stage: string;
  cash: string;
  burn: string;
  runway: string;
  spark: Spark[];
};

const EXAMPLE_SPARK_A: Spark[] = [
  { t: "1", v: 8 },
  { t: "2", v: 9 },
  { t: "3", v: 8 },
  { t: "4", v: 11 },
  { t: "5", v: 10 },
  { t: "6", v: 12 },
];

const EXAMPLE_SPARK_B: Spark[] = [
  { t: "1", v: 14 },
  { t: "2", v: 13 },
  { t: "3", v: null },
  { t: "4", v: 12 },
  { t: "5", v: 11 },
  { t: "6", v: 11 },
];

const ROWS: Row[] = [
  {
    id: "1",
    name: "EXAMPLE Alpha",
    stage: "Seed",
    cash: "—",
    burn: "—",
    runway: "—",
    spark: EXAMPLE_SPARK_A,
  },
  {
    id: "2",
    name: "EXAMPLE Beta",
    stage: "A",
    cash: "—",
    burn: "—",
    runway: "—",
    spark: EXAMPLE_SPARK_B,
  },
  {
    id: "3",
    name: "EXAMPLE Gamma",
    stage: "—",
    cash: "—",
    burn: "—",
    runway: "—",
    spark: [],
  },
];

function RowSpark({ data }: { data: Spark[] }) {
  if (data.length === 0) {
    return <span className="text-xs text-[#71717A]">—</span>;
  }
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke="#09090B"
            strokeWidth={1.1}
            fill="#09090B"
            fillOpacity={0.06}
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CompaniesTable() {
  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <header className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[#71717A]" strokeWidth={1.5} />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
              Companies
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Portfolio table</h1>
          </div>
        </header>

        <div className="overflow-x-auto rounded-lg border border-[#E4E4E7] bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-[11px] font-medium uppercase tracking-wide text-[#71717A]">
                <th className="px-3 py-2.5 font-medium">Company</th>
                <th className="px-3 py-2.5 font-medium">Stage</th>
                <th className="px-3 py-2.5 font-medium">Cash</th>
                <th className="px-3 py-2.5 font-medium">Burn</th>
                <th className="px-3 py-2.5 font-medium">Runway</th>
                <th className="px-3 py-2.5 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {ROWS.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAFAFA]/transition-colors duration-150">
                  <td className="px-3 py-2.5 font-medium">{r.name}</td>
                  <td className="px-3 py-2.5 text-[#71717A]">{r.stage}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.cash}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.burn}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.runway}</td>
                  <td className="px-3 py-2.5">
                    <RowSpark data={r.spark} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[#71717A]">
          Dense scaffold · EXAMPLE rows · missing cells stay — · sparklines optional per row
        </p>
      </div>
    </div>
  );
}
