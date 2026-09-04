import type { MetricKey, Unit } from "@venture-os/schema";

export type MetricDef = {
  key: MetricKey;
  label: string;
  unitFamily: "money" | "percent" | "months" | "count";
  defaultUnit: Unit;
  aliases: string[];
  higherIsBetter: boolean;
};

export const METRIC_CATALOG: MetricDef[] = [
  {
    key: "net_revenue",
    label: "Net revenue",
    unitFamily: "money",
    defaultUnit: "crore",
    aliases: ["net revenue", "net sales", "revenue", "sales", "turnover"],
    higherIsBetter: true,
  },
  {
    key: "gmv",
    label: "GMV",
    unitFamily: "money",
    defaultUnit: "crore",
    aliases: ["gmv", "gross merchandise", "gross sales"],
    higherIsBetter: true,
  },
  {
    key: "gross_margin_pct",
    label: "Gross margin",
    unitFamily: "percent",
    defaultUnit: "percent",
    aliases: ["gross margin", "gm %", "gm%", "gross margin %"],
    higherIsBetter: true,
  },
  {
    key: "contribution_margin_pct",
    label: "Contribution margin",
    unitFamily: "percent",
    defaultUnit: "percent",
    aliases: ["contribution margin", "cm %", "cm%"],
    higherIsBetter: true,
  },
  {
    key: "ebitda",
    label: "EBITDA",
    unitFamily: "money",
    defaultUnit: "crore",
    aliases: ["ebitda"],
    higherIsBetter: true,
  },
  {
    key: "cash",
    label: "Cash",
    unitFamily: "money",
    defaultUnit: "crore",
    aliases: ["cash", "closing cash", "cash balance", "bank balance"],
    higherIsBetter: true,
  },
  {
    key: "burn",
    label: "Burn",
    unitFamily: "money",
    defaultUnit: "crore",
    aliases: ["burn", "net burn", "cash burn", "monthly burn"],
    higherIsBetter: false,
  },
  {
    key: "runway_months",
    label: "Runway",
    unitFamily: "months",
    defaultUnit: "months",
    aliases: ["runway", "runway months", "cash runway"],
    higherIsBetter: true,
  },
  {
    key: "opex",
    label: "OpEx",
    unitFamily: "money",
    defaultUnit: "crore",
    aliases: ["opex", "operating expenses", "operating expense"],
    higherIsBetter: false,
  },
  {
    key: "cogs",
    label: "COGS",
    unitFamily: "money",
    defaultUnit: "crore",
    aliases: ["cogs", "cost of goods", "cost of goods sold"],
    higherIsBetter: false,
  },
  {
    key: "headcount",
    label: "Headcount",
    unitFamily: "count",
    defaultUnit: "count",
    aliases: ["headcount", "fte", "employees"],
    higherIsBetter: true,
  },
  {
    key: "customers",
    label: "Customers",
    unitFamily: "count",
    defaultUnit: "count",
    aliases: ["customers", "active customers", "users"],
    higherIsBetter: true,
  },
  {
    key: "aov",
    label: "AOV",
    unitFamily: "money",
    defaultUnit: "unit",
    aliases: ["aov", "average order value"],
    higherIsBetter: true,
  },
  {
    key: "cac",
    label: "CAC",
    unitFamily: "money",
    defaultUnit: "unit",
    aliases: ["cac", "customer acquisition cost"],
    higherIsBetter: false,
  },
  {
    key: "repeat_rate_pct",
    label: "Repeat rate",
    unitFamily: "percent",
    defaultUnit: "percent",
    aliases: ["repeat rate", "repurchase", "repeat %"],
    higherIsBetter: true,
  },
  {
    key: "plan_revenue",
    label: "Plan revenue",
    unitFamily: "money",
    defaultUnit: "crore",
    aliases: ["plan revenue", "budget revenue", "revenue plan"],
    higherIsBetter: true,
  },
];

export function metricByKey(key: string): MetricDef | undefined {
  return METRIC_CATALOG.find((m) => m.key === key);
}

export function matchMetricAlias(raw: string): MetricDef | undefined {
  const n = raw.toLowerCase().replace(/[_:]+/g, " ").replace(/\s+/g, " ").trim();
  return METRIC_CATALOG.find(
    (m) => m.label.toLowerCase() === n || m.aliases.some((a) => n === a || n.includes(a)),
  );
}
