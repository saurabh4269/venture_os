/**
 * One-shot builder for fixtures/v3-onboard/corpus.json.
 * Run: node packages/db/scripts/build-v3-corpus.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "../../../fixtures/v3-onboard/corpus.json");

const fx = { fxRate: 0.0112, fxDate: "2026-03-31", fxSource: "RBI_REFERENCE_ILLUSTRATIVE" };

const funds = [
  { id: "fund_india", name: "V3 India Evergreen", vintage: 2021, currency: "INR", committedCapital: 520 },
  { id: "fund_eu", name: "V3 Europe & US Evergreen", vintage: 2021, currency: "EUR", committedCapital: 180 },
];

const indiaCos = [
  ["superyou", "SuperYou", "wellness", "Series B", "IN", 0.09, 48, "2022-04-01"],
  ["hosteller", "The Hosteller", "travel", "Series B", "IN", 0.11, 62, "2021-09-15"],
  ["deconstruct", "Deconstruct", "food", "Series A", "IN", 0.14, 28, "2023-01-20"],
  ["gozero", "Go Zero", "food", "Series A", "IN", 0.12, 22, "2022-11-08"],
  ["ugaoo", "Ugaoo", "lifestyle", "Series A", "IN", 0.1, 18, "2023-06-01"],
  ["saladdays", "Salad Days", "food", "Seed", "IN", 0.08, 9, "2024-02-14"],
  ["cremecastle", "Creme Castle", "food", "Series A", "IN", 0.13, 15, "2023-08-22"],
  ["kukufm", "Kuku FM", "media", "Series C", "IN", 0.06, 85, "2020-05-10"],
  ["lightfury", "Lightfury Games", "gaming", "Series A", "IN", 0.15, 24, "2023-03-30"],
  ["earthful", "Earthful", "wellness", "Seed", "IN", 0.1, 7, "2024-05-01"],
  ["jewelbox", "Jewelbox", "lifestyle", "Series A", "IN", 0.11, 12, "2023-10-12"],
  ["fraganote", "Fraganote", "beauty", "Seed", "IN", 0.09, 6, "2024-07-18"],
];

const euCos = [
  ["katkin", "KatKin", "pet", "Series B", "GB", 0.07, 14, "2021-12-01", "EUR", "million"],
  ["yepoda", "Yepoda", "beauty", "Series B", "DE", 0.08, 11, "2022-06-15", "EUR", "million"],
  ["holy", "Holy", "wellness", "Series A", "US", 0.1, 9, "2023-04-20", "EUR", "million"],
  ["wild", "Wild", "beauty", "Series B", "GB", 0.06, 16, "2022-02-28", "EUR", "million"],
];

function monthlyRow(period, docId, page, base, sparse = 0) {
  const row = { period, sourceDocumentId: docId, sourcePage: page };
  if (sparse % 3 !== 0) row.netRevenue = base.rev;
  if (sparse % 4 !== 0) row.grossMarginPct = base.gm;
  if (sparse % 5 !== 1) row.contributionMarginPct = base.cm;
  if (sparse % 2 === 0) row.cash = base.cash;
  if (sparse % 3 !== 1) row.netBurn = base.burn;
  if (sparse % 4 !== 1) row.headcount = base.hc;
  if (sparse % 5 !== 2 && base.cac) row.cac = base.cac;
  if (sparse % 6 !== 0 && base.repeat) row.repeatRatePct = base.repeat;
  if (sparse % 7 === 0 && base.planPct) {
    row.revenueVsPlanPct = base.planPct;
  }
  return row;
}

const companies = [];
const documents = [];
let docIdx = 0;

for (const [id, name, sector, stage, country, own, cost, invested] of indiaCos) {
  const docId = `doc_${id}`;
  documents.push({
    id: docId,
    companyId: id,
    filename: `${id}-mis-fy26.xlsx`,
    periodStart: "2025-07-01",
    periodEnd: "2025-08-31",
  });
  const scale = 1 + (docIdx % 5) * 0.15;
  const base = {
    rev: +(3.2 * scale).toFixed(2),
    gm: +(42 + docIdx).toFixed(1),
    cm: +(28 + docIdx * 0.5).toFixed(1),
    cash: +(2.1 + docIdx * 0.2).toFixed(2),
    burn: +(0.45 + docIdx * 0.05).toFixed(2),
    hc: 80 + docIdx * 12,
    cac: docIdx % 2 === 0 ? 1200 + docIdx * 50 : undefined,
    repeat: docIdx % 3 === 0 ? 35 + docIdx : undefined,
    planPct: docIdx % 4 === 0 ? 92 + docIdx : undefined,
  };
  companies.push({
    id,
    name,
    sector,
    stage,
    country,
    fundId: "fund_india",
    ownershipPct: own,
    costBasis: cost,
    costCurrency: "INR",
    investedAt: invested,
    unitHint: "crore",
    currencyHint: "INR",
    mark: { asOf: "2026-03-31", value: cost * (1.4 + docIdx * 0.05), method: "last_round" },
    monthly: [
      monthlyRow("FY26 M4", docId, 2, base, docIdx),
      monthlyRow("FY26 M5", docId, 3, { ...base, rev: +(base.rev * 1.04).toFixed(2), cash: +(base.cash * 0.97).toFixed(2) }, docIdx + 1),
    ],
    commentary: [
      {
        period: "FY26 M5",
        objective: `MIS notes for ${name}: revenue trend in line with plan; gross margin stable.`,
        subjective: `Partner call: team executing on channel mix; hiring pace moderate.`,
        sourceDocumentId: docId,
        sourcePage: 1,
      },
    ],
  });
  docIdx++;
}

for (const [id, name, sector, stage, country, own, cost, invested, currency, unit] of euCos) {
  const docId = `doc_${id}`;
  documents.push({
    id: docId,
    companyId: id,
    filename: `${id}-board-pack-fy26.pdf`,
    periodStart: "2025-07-01",
    periodEnd: "2025-08-31",
    kind: "board_pack",
  });
  const scale = 1 + (docIdx % 4) * 0.2;
  const base = {
    rev: +(2.8 * scale).toFixed(2),
    gm: +(48 + docIdx).toFixed(1),
    cm: +(32 + docIdx * 0.4).toFixed(1),
    cash: +(1.6 + docIdx * 0.15).toFixed(2),
    burn: +(0.35 + docIdx * 0.04).toFixed(2),
    hc: 60 + docIdx * 10,
    cac: 18 + docIdx,
    repeat: 40 + docIdx,
    planPct: 95,
  };
  companies.push({
    id,
    name,
    sector,
    stage,
    country,
    fundId: "fund_eu",
    ownershipPct: own,
    costBasis: cost,
    costCurrency: currency,
    investedAt: invested,
    unitHint: unit,
    currencyHint: currency,
    mark: { asOf: "2026-03-31", value: cost * (1.55 + docIdx * 0.03), method: "last_round" },
    monthly: [
      monthlyRow("FY26 M4", docId, 4, base, docIdx),
      monthlyRow("FY26 M5", docId, 5, { ...base, rev: +(base.rev * 1.06).toFixed(2) }, docIdx + 2),
    ],
    commentary: docIdx % 2 === 0
      ? [
          {
            period: "FY26 M5",
            objective: `Board pack KPI summary for ${name}.`,
            subjective: `IC discussion: brand momentum strong in core markets.`,
            sourceDocumentId: docId,
            sourcePage: 2,
          },
        ]
      : undefined,
  });
  docIdx++;
}

const pendingInbox = [
  {
    companyId: "hosteller",
    documentId: "doc_hosteller",
    metricKey: "burn",
    valueNumeric: 0.52,
    unit: "crore",
    currency: "INR",
    period: "FY26 M5",
    locator: { sheet: "MIS", cell: "D18" },
    confidence: 0.78,
  },
  {
    companyId: "deconstruct",
    documentId: "doc_deconstruct",
    metricKey: "net_revenue",
    valueNumeric: 3.74,
    unit: "crore",
    currency: "INR",
    period: "FY26 M5",
    locator: { sheet: "MIS", cell: "C8" },
    confidence: 0.81,
  },
  {
    companyId: "yepoda",
    documentId: "doc_yepoda",
    metricKey: "gross_margin_pct",
    valueNumeric: 51.2,
    unit: "percent",
    currency: "unknown",
    period: "FY26 M5",
    locator: { page: 5, region: "KPI table" },
    confidence: 0.72,
  },
];

const corpus = {
  version: 1,
  attribution: "fixtures/v3-onboard/ATTRIBUTION.txt",
  fx,
  funds,
  companies,
  documents,
  pendingInbox,
};

writeFileSync(out, JSON.stringify(corpus, null, 2));
console.log(`Wrote ${out} (${companies.length} companies, ${documents.length} documents)`);
