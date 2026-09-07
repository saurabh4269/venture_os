"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const FOREST = "#163d34";
const FOREST_SOFT = "#5a8f7b";
const LIME = "#8fbf3a";
const WARN = "#8a6a1a";
const DANGER = "#b42318";
const MUTED = "#5a6b64";
const RULE = "#d5ded9";

const tipStyle = {
  background: "#fffdf8",
  border: `1px solid ${RULE}`,
  borderRadius: 8,
  fontSize: 12,
  color: FOREST,
};

function fmtPeriod(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return iso.slice(0, 7);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function fmtNum(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="chart-empty" role="status">
      {label}
    </div>
  );
}

export function CoverageMixChart({
  booked,
  gap,
  review,
}: {
  booked: number;
  gap: number;
  review: number;
}) {
  const data = [
    { name: "Booked", value: booked, color: FOREST },
    { name: "Gap", value: gap, color: DANGER },
    { name: "Review", value: review, color: WARN },
  ].filter((d) => d.value > 0);
  if (data.length === 0) return <ChartEmpty label="No companies to chart." />;
  return (
    <div className="chart-frame" aria-label="Coverage mix">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip contentStyle={tipStyle} formatter={(v) => [fmtNum(Number(v)), "Names"]} />
          <Legend verticalAlign="bottom" height={28} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashByCompanyChart({
  rows,
}: {
  rows: { name: string; cash: number; periodEnd: string }[];
}) {
  if (rows.length === 0) return <ChartEmpty label="No booked cash to chart." />;
  const data = rows.map((r) => ({
    name: r.name.length > 14 ? `${r.name.slice(0, 12)}…` : r.name,
    full: r.name,
    cash: r.cash,
    period: fmtPeriod(r.periodEnd),
  }));
  return (
    <div className="chart-frame" aria-label="Cash by company">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid stroke={RULE} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} tickFormatter={fmtNum} />
          <YAxis type="category" dataKey="name" width={96} tick={{ fill: MUTED, fontSize: 11 }} />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(v, _n, p) => [fmtNum(Number(v)), `${(p?.payload as { full?: string })?.full ?? "Cash"} · booked`]}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { period?: string } | undefined;
              return row?.period ? `As of ${row.period}` : "Booked cash";
            }}
          />
          <Bar dataKey="cash" fill={FOREST} radius={[0, 6, 6, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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
  const data = rows
    .filter((r) => r.cashSum != null || r.revenueSum != null || r.burnSum != null)
    .map((r) => ({
      period: fmtPeriod(r.periodEnd),
      cash: r.cashSum,
      revenue: r.revenueSum,
      burn: r.burnSum,
      cashN: r.cashN,
      revenueN: r.revenueN,
      burnN: r.burnN,
    }));
  if (data.length < 2) return <ChartEmpty label="Need at least two booked periods for a trend." />;
  return (
    <div className="chart-frame" aria-label="Portfolio booked series">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={FOREST} stopOpacity={0.28} />
              <stop offset="100%" stopColor={FOREST} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LIME} stopOpacity={0.35} />
              <stop offset="100%" stopColor={LIME} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={RULE} strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fill: MUTED, fontSize: 11 }} />
          <YAxis tick={{ fill: MUTED, fontSize: 11 }} tickFormatter={fmtNum} width={56} />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(v, name, p) => {
              if (v == null) return ["—", String(name)];
              const n =
                name === "cash"
                  ? (p?.payload as { cashN?: number })?.cashN
                  : name === "revenue"
                    ? (p?.payload as { revenueN?: number })?.revenueN
                    : (p?.payload as { burnN?: number })?.burnN;
              return [`${fmtNum(Number(v))} · ${n ?? 0} cos`, String(name)];
            }}
          />
          <Legend iconType="circle" />
          <Area type="monotone" dataKey="cash" name="Cash Σ" stroke={FOREST} fill="url(#cashFill)" strokeWidth={2} connectNulls={false} />
          <Area type="monotone" dataKey="revenue" name="Revenue Σ" stroke={LIME} fill="url(#revFill)" strokeWidth={2} connectNulls={false} />
          <Line type="monotone" dataKey="burn" name="Burn Σ" stroke={WARN} strokeWidth={2} dot={false} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="chart-foot">Sums only include companies with a booked value that period — missing is not zero.</p>
    </div>
  );
}

export function CompanyMetricHistoryChart({
  points,
}: {
  points: { periodEnd: string; cash: number | null; burn: number | null; revenue: number | null }[];
}) {
  const data = points.map((p) => ({
    period: fmtPeriod(p.periodEnd),
    cash: p.cash,
    burn: p.burn,
    revenue: p.revenue,
  }));
  const hasSeries = data.filter((d) => d.cash != null || d.burn != null || d.revenue != null).length >= 2;
  if (!hasSeries) return <ChartEmpty label="Need at least two booked periods for a company trend." />;
  return (
    <div className="chart-frame" aria-label="Company metric history">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke={RULE} strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fill: MUTED, fontSize: 11 }} />
          <YAxis tick={{ fill: MUTED, fontSize: 11 }} tickFormatter={fmtNum} width={56} />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(v, name) => [v == null ? "—" : fmtNum(Number(v)), String(name)]}
          />
          <Legend iconType="circle" />
          <Line type="monotone" dataKey="cash" name="Cash" stroke={FOREST} strokeWidth={2.2} dot={{ r: 3 }} connectNulls={false} />
          <Line type="monotone" dataKey="revenue" name="Revenue" stroke={LIME} strokeWidth={2.2} dot={{ r: 3 }} connectNulls={false} />
          <Line type="monotone" dataKey="burn" name="Burn" stroke={WARN} strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="chart-foot">Current version per period from the book. Gaps stay blank.</p>
    </div>
  );
}

export function FundRollupBars({
  rows,
}: {
  rows: { fundName: string; cashSum: number | null; burnSum: number | null; revenueSum: number | null }[];
}) {
  const data = rows
    .filter((r) => r.cashSum != null || r.burnSum != null || r.revenueSum != null)
    .map((r) => ({
      name: r.fundName.length > 16 ? `${r.fundName.slice(0, 14)}…` : r.fundName,
      cash: r.cashSum,
      burn: r.burnSum,
      revenue: r.revenueSum,
    }));
  if (data.length === 0) return <ChartEmpty label="No fund rollup figures to chart." />;
  return (
    <div className="chart-frame" aria-label="Fund operating rollup">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke={RULE} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} />
          <YAxis tick={{ fill: MUTED, fontSize: 11 }} tickFormatter={fmtNum} width={56} />
          <Tooltip contentStyle={tipStyle} formatter={(v, name) => [v == null ? "—" : fmtNum(Number(v)), String(name)]} />
          <Legend iconType="circle" />
          <Bar dataKey="cash" name="Cash Σ" fill={FOREST} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="revenue" name="Revenue Σ" fill={FOREST_SOFT} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="burn" name="Burn Σ" fill={WARN} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
