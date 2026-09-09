'use client';

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EyeOff, GitCompare } from "lucide-react";

/**
 * Compare — peer toggles, BarChart + RadarChart placeholders, Hide empty.
 * Inspired by ecommerce cohort bars + social period compare + data-viz overlays.
 */

type Peer = {
  id: string;
  name: string;
  revenue: number | null;
  burn: number | null;
  runway: number | null;
  enabled: boolean;
};

const EXAMPLE_PEERS: Peer[] = [
  { id: "p1", name: "EXAMPLE Alpha", revenue: 42, burn: 3.2, runway: 18, enabled: true },
  { id: "p2", name: "EXAMPLE Beta", revenue: 28, burn: 2.1, runway: 22, enabled: true },
  { id: "p3", name: "EXAMPLE Gamma", revenue: null, burn: null, runway: null, enabled: false },
  { id: "p4", name: "EXAMPLE Delta", revenue: 35, burn: 4.0, runway: 11, enabled: true },
];

export default function ComparePeers() {
  const [peers, setPeers] = useState(EXAMPLE_PEERS);
  const [hideEmpty, setHideEmpty] = useState(true);

  const visible = useMemo(() => {
    return peers.filter((p) => {
      if (!p.enabled) return false;
      if (!hideEmpty) return true;
      return p.revenue != null || p.burn != null || p.runway != null;
    });
  }, [peers, hideEmpty]);

  const barData = visible.map((p) => ({
    name: p.name.replace("EXAMPLE ", ""),
    revenue: p.revenue,
    burn: p.burn,
  }));

  const radarData = [
    {
      metric: "Revenue",
      ...Object.fromEntries(visible.map((p) => [p.id, p.revenue ?? 0])),
    },
    {
      metric: "Burn",
      ...Object.fromEntries(visible.map((p) => [p.id, p.burn ?? 0])),
    },
    {
      metric: "Runway",
      ...Object.fromEntries(visible.map((p) => [p.id, p.runway ?? 0])),
    },
  ];

  function toggle(id: string) {
    setPeers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
  }

  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
              Compare
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
              <GitCompare className="h-5 w-5" strokeWidth={1.5} />
              Peer metrics
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setHideEmpty((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-medium transition-colors duration-200 hover:bg-[#FAFAFA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B]"
          >
            <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
            Hide empty {hideEmpty ? "on" : "off"}
          </button>
        </header>

        <section className="flex flex-wrap gap-2">
          {peers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B] ${
                p.enabled
                  ? "border-[#09090B] bg-[#09090B] text-white"
                  : "border-[#E4E4E7] bg-white text-[#71717A]"
              }`}
            >
              {p.name}
              {p.revenue == null && p.burn == null ? " · —" : ""}
            </button>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-[#E4E4E7] bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Bar · revenue / burn</h2>
            <div className="h-64">
              {barData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-[#71717A]">
                  No peers selected
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#E4E4E7" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#71717A", fontSize: 11 }}
                      axisLine={{ stroke: "#E4E4E7" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#71717A", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #E4E4E7",
                        borderRadius: 8,
                        fontSize: 12,
                        background: "#FFFFFF",
                      }}
                    />
                    <Bar dataKey="revenue" fill="#09090B" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="burn" fill="#71717A" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="mt-2 text-[10px] text-[#71717A]">EXAMPLE placeholders · missing stays hidden when Hide empty is on</p>
          </section>

          <section className="rounded-lg border border-[#E4E4E7] bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Radar · placeholder</h2>
            <div className="h-64">
              {visible.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-[#71717A]">
                  No peers selected
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E4E4E7" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#71717A", fontSize: 11 }} />
                    <PolarRadiusAxis tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} />
                    {visible.map((p, i) => (
                      <Radar
                        key={p.id}
                        name={p.name}
                        dataKey={p.id}
                        stroke={i === 0 ? "#09090B" : "#71717A"}
                        fill={i === 0 ? "#09090B" : "#71717A"}
                        fillOpacity={0.08}
                        isAnimationActive={false}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="mt-2 text-[10px] text-[#71717A]">
              Radar uses 0 only for axis geometry — do not treat as filed metrics
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
