#!/usr/bin/env node
/**
 * FIXTURE_ONLY — generates synthetic MIS packs for extract / Confirm testing.
 *
 * Company *names* are taken from the public V3 Ventures homepage logos
 * (https://www.v3.ventures/, fetched 2026-09-07). Every number is invented
 * for fixtures and must never be treated as live book facts.
 *
 *   node scripts/generate-fixture-mis.mjs
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = join(root, "fixtures/mis/FIXTURE_ONLY");

/** Public logo names on v3.ventures (2026-09-07). Sector labels are public-context only. */
const PORTFOLIO = [
  { slug: "creme-castle", name: "Creme Castle", sector: "Food & drinks", geo: "India" },
  { slug: "hosteller", name: "The Hosteller", sector: "Lifestyle / travel", geo: "India" },
  { slug: "ugaoo", name: "Ugaoo", sector: "Lifestyle / home", geo: "India" },
  { slug: "wild", name: "Wild", sector: "Wellness & beauty", geo: "UK" },
  { slug: "holy", name: "Holy", sector: "Food & drinks", geo: "Europe" },
  { slug: "yepoda", name: "Yepoda", sector: "Wellness & beauty", geo: "Europe" },
  { slug: "go-zero", name: "Go Zero", sector: "Food & drinks", geo: "India" },
  { slug: "katkin", name: "KatKin", sector: "Lifestyle / pet", geo: "UK" },
  { slug: "deconstruct", name: "Deconstruct", sector: "Wellness & beauty", geo: "India" },
  { slug: "salad-days", name: "Salad Days", sector: "Food & drinks", geo: "India" },
  { slug: "cava", name: "CAVA Athleisure", sector: "Lifestyle", geo: "India" },
  { slug: "lightfury-games", name: "Lightfury Games", sector: "Lifestyle / entertainment", geo: "India" },
  { slug: "superyou", name: "SuperYou", sector: "Food & drinks", geo: "India" },
];

async function writeXlsx(path, sheets) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Venture OS FIXTURE_ONLY generator";
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    for (const row of sheet.rows) ws.addRow(row);
  }
  mkdirSync(dirname(path), { recursive: true });
  await wb.xlsx.writeFile(path);
}

function writeCsv(path, rows) {
  mkdirSync(dirname(path), { recursive: true });
  const body = rows
    .map((r) =>
      r
        .map((c) => {
          const s = c == null ? "" : String(c);
          return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  writeFileSync(path, `# FIXTURE_ONLY — invented numbers, not live book facts\n${body}\n`);
}

const cases = [];

async function main() {
  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });

  // 1) Creme Castle — INR crore, classic metric × month (2 months) — dashboard cash/burn/revenue/GM
  {
    const co = PORTFOLIO[0];
    const dir = join(outRoot, co.slug);
    const rows = [
      ["Metric", "FY26 M4 (INR Cr)", "FY26 M5 (INR Cr)"],
      ["Net revenue", 8.2, 9.1],
      ["Gross revenue", 9.0, 9.8],
      ["COGS", 4.1, 4.4],
      ["Gross margin %", 50, 52],
      ["OpEx", 2.8, 3.0],
      ["EBITDA", 1.3, 1.7],
      ["Closing cash", 6.4, 5.9],
      ["Monthly burn", 0.55, 0.5],
      ["Headcount", 62, 65],
      ["Customers", 41000, 44500],
      ["Orders", 18200, 19100],
      ["AOV", 450, 476],
      ["FIXTURE_ONLY note", "Invented", "Invented"],
    ];
    await writeXlsx(join(dir, "FIXTURE_ONLY-creme-castle-FY26-M4-M5.xlsx"), [
      { name: "MIS", rows },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-creme-castle-FY26-M4-M5.xlsx"],
      challenge: "standard_inr_crore_multi_month",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct", "headcount"],
    });
  }

  // 2) Hosteller — lakh units, sheet named Financials, single month + prior
  {
    const co = PORTFOLIO[1];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-hosteller-Aug2025-lakhs.xlsx"), [
      {
        name: "Financials",
        rows: [
          ["Line item (INR lakh)", "Aug 2025", "Jul 2025"],
          ["Revenue", 420, 390],
          ["COGS", 110, 105],
          ["Gross Margin %", 74, 73],
          ["Operating expenses", 280, 270],
          ["EBITDA", 30, 15],
          ["Cash balance", 1850, 1920],
          ["Net burn", 70, 80],
          ["Headcount", 410, 398],
          ["Occupancy users", 52000, 50000],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-hosteller-Aug2025-lakhs.xlsx"],
      challenge: "lakh_units_financials_sheet",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct", "headcount"],
    });
  }

  // 3) Ugaoo — wide FY months, calendar mix, plan row
  {
    const co = PORTFOLIO[2];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-ugaoo-FY26-Q1.xlsx"), [
      {
        name: "P&L",
        rows: [
          ["INR Crore", "Apr-25", "May-25", "Jun-25"],
          ["Net Sales", 3.4, 3.7, 4.1],
          ["Gross Sales", 3.9, 4.2, 4.6],
          ["COGS", 1.8, 1.9, 2.0],
          ["GM %", 47, 49, 51],
          ["OpEx", 1.6, 1.7, 1.75],
          ["EBITDA", -0.05, 0.1, 0.35],
          ["Plan revenue", 3.6, 3.9, 4.2],
          ["Closing cash", 2.1, 1.95, 2.05],
          ["Cash burn", 0.25, 0.22, 0.18],
          ["Headcount", 95, 98, 102],
          ["Orders", 28000, 30500, 33000],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-ugaoo-FY26-Q1.xlsx"],
      challenge: "wide_month_columns_plan_vs_actual",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct", "headcount"],
    });
  }

  // 4) Wild — USD reporting (UK brand), different labels
  {
    const co = PORTFOLIO[3];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-wild-2025-Q2-USD.xlsx"), [
      {
        name: "Management accounts",
        rows: [
          ["USD thousands", "Apr 2025", "May 2025", "Jun 2025"],
          ["Net revenue", 420, 445, 470],
          ["Gross margin", 62, 63, 64],
          ["OpEx", 310, 320, 330],
          ["EBITDA", 40, 55, 70],
          ["Cash", 2100, 2050, 1980],
          ["Monthly burn", 120, 115, 110],
          ["Headcount", 48, 50, 51],
          ["Customers", 85000, 88000, 91000],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-wild-2025-Q2-USD.xlsx"],
      challenge: "usd_thousands_management_accounts",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct", "headcount"],
    });
  }

  // 5) Holy — EUR, European FY wording
  {
    const co = PORTFOLIO[4];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-holy-H1-2025-EUR.xlsx"), [
      {
        name: "KPI pack",
        rows: [
          ["EUR m", "Jan 2025", "Feb 2025", "Mar 2025"],
          ["Turnover", 1.2, 1.35, 1.4],
          ["Gross margin %", 55, 56, 57],
          ["Operating expenses", 0.95, 1.0, 1.05],
          ["EBITDA", 0.05, 0.1, 0.12],
          ["Bank balance", 4.8, 4.6, 4.5],
          ["Net burn", 0.2, 0.18, 0.15],
          ["Headcount", 22, 23, 24],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-holy-H1-2025-EUR.xlsx"],
      challenge: "eur_millions_turnover_alias",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct", "headcount"],
    });
  }

  // 6) Yepoda — Gross vs Net split, product lines noise
  {
    const co = PORTFOLIO[5];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-yepoda-May2025.xlsx"), [
      {
        name: "P&L",
        rows: [
          ["EUR '000", "May 2025 Actual", "May 2025 Plan"],
          ["Gross sales revenue", 890, 920],
          ["Returns / discounts", 40, 35],
          ["Net sales", 850, 885],
          ["Cost of goods sold", 310, 320],
          ["Gross margin %", 63.5, 64],
          ["Marketing OpEx", 220, 200],
          ["Other OpEx", 180, 175],
          ["EBITDA", 140, 190],
          ["Closing cash balance", 3200, null],
          ["Cash burn", 90, 70],
          ["Headcount", 35, 34],
          ["Active customers", 120000, 125000],
        ],
      },
      {
        name: "By SKU (ignore)",
        rows: [
          ["SKU", "Units"],
          ["Mist-01", 12000],
          ["Mask-02", 8000],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-yepoda-May2025.xlsx"],
      challenge: "gross_vs_net_plan_extra_sheet",
      expects: ["gross_revenue", "net_revenue", "cash", "burn", "gross_margin_pct"],
    });
  }

  // 7) Go Zero — ambiguous units (no crore/lakh/USD token) → unit_ambiguity path
  {
    const co = PORTFOLIO[6];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-go-zero-ambiguous-units.xlsx"), [
      {
        name: "Sheet1",
        rows: [
          ["Metric", "June"],
          ["Revenue", 2.4],
          ["Cash", 1.1],
          ["Burn", 0.3],
          ["Gross margin", 42],
          ["Headcount", 40],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-go-zero-ambiguous-units.xlsx"],
      challenge: "ambiguous_units_hitl",
      expects: ["unit_ambiguity"],
    });
  }

  // 8) KatKin — GBP labeled, subscription metrics
  {
    const co = PORTFOLIO[7];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-katkin-2025-05-GBP.xlsx"), [
      {
        name: "Board pack numbers",
        rows: [
          ["GBP", "Mar 2025", "Apr 2025", "May 2025"],
          ["Net revenue", 1_250_000, 1_310_000, 1_380_000],
          ["Gross margin %", 48, 49, 50],
          ["OpEx", 980_000, 1_000_000, 1_020_000],
          ["EBITDA", -50_000, 10_000, 40_000],
          ["Cash", 4_200_000, 4_050_000, 3_950_000],
          ["Monthly burn", 180_000, 160_000, 140_000],
          ["Headcount", 58, 60, 61],
          ["Subscribers", 42000, 43500, 45000],
          ["Churn %", 4.2, 4.0, 3.8],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-katkin-2025-05-GBP.xlsx"],
      challenge: "gbp_absolute_amounts_subscribers",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct", "headcount"],
    });
  }

  // 9) Deconstruct — missing cash (dash), has burn/revenue — missing ≠ 0
  {
    const co = PORTFOLIO[8];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-deconstruct-missing-cash.xlsx"), [
      {
        name: "Monthly MIS",
        rows: [
          ["INR Cr · FY26 M6", "Value"],
          ["Net revenue", 5.6],
          ["Gross margin %", 68],
          ["COGS", 1.8],
          ["OpEx", 3.2],
          ["EBITDA", 0.6],
          ["Closing cash", "—"],
          ["Monthly burn", 0.4],
          ["Headcount", 72],
          ["Customers", 210000],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-deconstruct-missing-cash.xlsx"],
      challenge: "missing_cash_not_zero",
      expects: ["net_revenue", "burn", "gross_margin_pct"],
      must_not_invent: ["cash"],
    });
  }

  // 10) Salad Days — actual vs plan, below-plan revenue (flag path)
  {
    const co = PORTFOLIO[9];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-salad-days-below-plan.xlsx"), [
      {
        name: "Performance",
        rows: [
          ["INR crore", "FY26 M3 Actual", "FY26 M3 Plan", "FY26 M2 Actual"],
          ["Net revenue", 2.1, 2.8, 2.3],
          ["Gross margin %", 44, 46, 45],
          ["OpEx", 1.9, 1.7, 1.85],
          ["EBITDA", -0.2, 0.3, 0.05],
          ["Cash", 1.4, null, 1.6],
          ["Burn", 0.35, 0.2, 0.3],
          ["Headcount", 55, 52, 54],
          ["Orders", 95000, 110000, 100000],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-salad-days-below-plan.xlsx"],
      challenge: "below_plan_revenue_for_flags",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct"],
    });
  }

  // 11) CAVA — CSV calendar months, US-style labels
  {
    const co = PORTFOLIO[10];
    const dir = join(outRoot, co.slug);
    writeCsv(join(dir, "FIXTURE_ONLY-cava-2025-H1.csv"), [
      ["Metric", "Jan 2025 (INR Cr)", "Feb 2025 (INR Cr)", "Mar 2025 (INR Cr)"],
      ["Sales", 1.8, 1.9, 2.05],
      ["Gross margin", 58, 59, 60],
      ["Cash", 3.2, 3.0, 2.85],
      ["Burn", 0.22, 0.2, 0.18],
      ["Headcount", 28, 29, 30],
      ["Customers", 18000, 19000, 20500],
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-cava-2025-H1.csv"],
      challenge: "csv_calendar_months_sales_alias",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct", "headcount"],
    });
  }

  // 12) Lightfury — multi-tab P&L + Cash; gaming ops metrics
  {
    const co = PORTFOLIO[11];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-lightfury-Jul2025.xlsx"), [
      {
        name: "P&L",
        rows: [
          ["INR Cr", "May 2025", "Jun 2025", "Jul 2025"],
          ["Net revenue", 0.9, 1.1, 1.35],
          ["Gross margin %", 72, 74, 75],
          ["OpEx", 1.4, 1.5, 1.55],
          ["EBITDA", -0.5, -0.4, -0.2],
          ["Headcount", 85, 90, 94],
          ["MAU users", 450000, 520000, 610000],
        ],
      },
      {
        name: "Cash",
        rows: [
          ["INR Cr", "May 2025", "Jun 2025", "Jul 2025"],
          ["Closing cash", 8.5, 7.8, 7.2],
          ["Net burn", 0.7, 0.7, 0.6],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-lightfury-Jul2025.xlsx"],
      challenge: "split_pnl_and_cash_tabs",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct", "headcount"],
    });
  }

  // 13) SuperYou — fuzzy / typo labels for capped-confidence suggest
  {
    const co = PORTFOLIO[12];
    const dir = join(outRoot, co.slug);
    await writeXlsx(join(dir, "FIXTURE_ONLY-superyou-fuzzy-labels.xlsx"), [
      {
        name: "MIS dump",
        rows: [
          ["Field", "FY26 M5 INR Cr"],
          ["Nett revenue", 4.8],
          ["Kash balance", 3.1],
          ["Monthly burn rate", 0.45],
          ["GM%", 41],
          ["Head count", 67],
          ["Orders / transactions", 140000],
          ["AOV", 340],
        ],
      },
    ]);
    cases.push({
      company: co.name,
      slug: co.slug,
      files: ["FIXTURE_ONLY-superyou-fuzzy-labels.xlsx"],
      challenge: "fuzzy_typo_labels",
      expects: ["net_revenue", "cash", "burn", "gross_margin_pct"],
    });
  }

  // Extra month packs for runway (need 3 months burn) — Creme Castle M3 solo CSV
  writeCsv(join(outRoot, "creme-castle", "FIXTURE_ONLY-creme-castle-FY26-M3.csv"), [
    ["Metric", "FY26 M3 (INR Cr)"],
    ["Net revenue", 7.5],
    ["Gross margin %", 49],
    ["Closing cash", 7.0],
    ["Monthly burn", 0.6],
    ["Headcount", 60],
  ]);
  cases[0].files.push("FIXTURE_ONLY-creme-castle-FY26-M3.csv");
  cases[0].challenge = "standard_inr_crore_multi_month_plus_prior_csv";

  const manifest = {
    label: "FIXTURE_ONLY",
    generatedAt: new Date().toISOString().slice(0, 10),
    source: {
      portfolioNames: "https://www.v3.ventures/ public homepage logos (2026-09-07)",
      numbers: "Invented for extract testing — not live company financials",
      rfp: "docs/brief/V3_Requirement_Brief_v3_Gargi_2026-09-03.md §5 field groups",
    },
    portfolio: PORTFOLIO,
    cases,
    dashboardCoverage: {
      fromMis: [
        "stage (company profile, not MIS)",
        "cash / burn / runway (derived)",
        "revenue / GM / OpEx / EBITDA",
        "headcount / customers / orders / AOV where present",
      ],
      notFromMis: [
        "ownership % (Affinity)",
        "NAV / MOIC / IRR (marks + positions)",
        "subjective commentary (Granola)",
      ],
    },
  };

  writeFileSync(join(outRoot, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");

  const readme = `# FIXTURE_ONLY — V3-named portfolio MIS packs

**These are not the book.** Every monetary and operating figure is **invented** for extract / Confirm / flag testing. Company *names* come from the public V3 Ventures homepage logos ([v3.ventures](https://www.v3.ventures/), fetched 2026-09-07). Do not paste into a production org without the FIXTURE banner.

## Portfolio names included (public logos)

${PORTFOLIO.map((p) => `- **${p.name}** (${p.sector}, ${p.geo})`).join("\n")}

Public context also notes Wild’s Unilever exit elsewhere on the internet; the name still appears on the homepage logo strip, so a MIS fixture is included for format coverage only.

## RFP extraction challenges covered

| Slug | Challenge |
| --- | --- |
${cases.map((c) => `| \`${c.slug}\` | ${c.challenge} |`).join("\n")}

## Dashboard fields these packs can feed (after Confirm)

From MIS (objective): net/gross revenue, GM%, COGS/OpEx/EBITDA where present, closing cash, burn, headcount, customers/orders/AOV/users.

Derived in product (not in file as fact): **runway** = cash / avg last-3-month burn (needs ≥1 confirmed cash + burn series).

Not in these MIS (by design): ownership %, NAV, MOIC/IRR, subjective call commentary — Affinity / marks / Granola.

## How to use

1. Sign in → add companies with the public names (or reuse Fixture Capital).
2. Upload a file from \`fixtures/mis/FIXTURE_ONLY/<slug>/\`.
3. Confirm → Command / Flags / Compare / Ask should only show confirmed facts.
4. Regenerate: \`node scripts/generate-fixture-mis.mjs\`

See \`MANIFEST.json\` for expected metrics per case.
`;

  writeFileSync(join(outRoot, "README.md"), readme);
  console.log(`Wrote ${cases.length} company fixture packs under ${outRoot}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
