#!/usr/bin/env node
/**
 * FIXTURE_ONLY — 6-month MIS history packs for trend / runway / compare analysis.
 * Does not wipe extract-challenge packs under fixtures/mis/FIXTURE_ONLY/<slug>/.
 *
 *   node scripts/generate-fixture-history.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = join(root, "fixtures/mis/FIXTURE_ONLY");

const PORTFOLIO = [
  { slug: "creme-castle", name: "Creme Castle", unit: "crore", currency: "INR", seed: 8.0 },
  { slug: "hosteller", name: "The Hosteller", unit: "crore", currency: "INR", seed: 4.2 },
  { slug: "ugaoo", name: "Ugaoo", unit: "crore", currency: "INR", seed: 3.4 },
  { slug: "wild", name: "Wild", unit: "thousand", currency: "USD", seed: 420 },
  { slug: "holy", name: "Holy", unit: "million", currency: "EUR", seed: 1.8 },
  { slug: "yepoda", name: "Yepoda", unit: "thousand", currency: "EUR", seed: 310 },
  { slug: "go-zero", name: "Go Zero", unit: "crore", currency: "INR", seed: 2.1 },
  { slug: "katkin", name: "KatKin", unit: "thousand", currency: "GBP", seed: 180 },
  { slug: "deconstruct", name: "Deconstruct", unit: "crore", currency: "INR", seed: 1.6 },
  { slug: "salad-days", name: "Salad Days", unit: "crore", currency: "INR", seed: 5.5 },
  { slug: "cava", name: "CAVA Athleisure", unit: "crore", currency: "INR", seed: 2.8 },
  { slug: "lightfury-games", name: "Lightfury Games", unit: "crore", currency: "INR", seed: 1.2 },
  { slug: "superyou", name: "SuperYou", unit: "crore", currency: "INR", seed: 3.0 },
];

/** FY26 M1–M6 = Apr 2025 … Sep 2025 when FY starts April. */
const MONTHS = [1, 2, 3, 4, 5, 6];

function unitHeader(unit, currency) {
  if (unit === "crore") return `${currency} Cr`;
  if (unit === "lakh") return `${currency} lakh`;
  if (unit === "thousand") return `${currency} thousands`;
  if (unit === "million") return `${currency} m`;
  return currency;
}

function series(seed, n, growth = 0.04, wobble = 0.03) {
  const out = [];
  let v = seed;
  for (let i = 0; i < n; i++) {
    const jitter = 1 + ((i % 3) - 1) * wobble;
    v = v * (1 + growth) * jitter;
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

async function writeXlsx(path, sheets) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Venture OS FIXTURE_ONLY history generator";
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    for (const row of sheet.rows) ws.addRow(row);
  }
  mkdirSync(dirname(path), { recursive: true });
  await wb.xlsx.writeFile(path);
}

async function main() {
  const historyFiles = [];
  for (const co of PORTFOLIO) {
    const dir = join(outRoot, co.slug);
    mkdirSync(dir, { recursive: true });
    const uh = unitHeader(co.unit, co.currency);
    const headers = ["Metric", ...MONTHS.map((m) => `FY26 M${m} (${uh})`)];
    const rev = series(co.seed, 6, 0.045, 0.02);
    let cash = series(co.seed * 1.4, 6, -0.03, 0.015).map((v, i) =>
      Math.round((v + (5 - i) * co.seed * 0.02) * 100) / 100,
    );
    let burn = series(co.seed * 0.12, 6, -0.02, 0.04);
    // Flag-path packs: invented stress so Confirm → Flags has real detectors to fire.
    if (co.slug === "salad-days") {
      cash = [3.2, 2.8, 2.2, 1.7, 1.2, 0.85];
      burn = [0.28, 0.3, 0.32, 0.38, 0.42, 0.48];
      rev[4] = 1.9;
      rev[5] = 1.7;
    }
    if (co.slug === "deconstruct") {
      cash = [2.4, 2.2, 2.0, 1.8, 1.6, "—"];
    }
    if (co.slug === "hosteller") {
      burn = [0.22, 0.24, 0.25, 0.28, 0.35, 0.48];
    }
    const gm = [48, 49, 50, 51, 50, 52];
    const opex = series(co.seed * 0.35, 6, 0.02, 0.01);
    const ebitda = rev.map((r, i) => Math.round((r * (gm[i] / 100) - opex[i]) * 100) / 100);
    const hc = series(40 + co.seed * 2, 6, 0.02, 0.01).map((v) => Math.round(v));
    const customers = series(20000 + co.seed * 1000, 6, 0.03, 0.01).map((v) => Math.round(v));

    const plan = rev.map((r, i) => Math.round(r * (co.slug === "salad-days" ? 1.45 : 1.05) * 100) / 100);

    const rows = [
      headers,
      ["Net revenue", ...rev],
      ["Plan revenue", ...plan],
      ["Gross margin %", ...gm],
      ["OpEx", ...opex],
      ["EBITDA", ...ebitda],
      ["Closing cash", ...cash],
      ["Monthly burn", ...burn],
      ["Headcount", ...hc],
      ["Customers", ...customers],
      ["FIXTURE_ONLY note", ...MONTHS.map(() => "Invented history")],
    ];

    const file = `FIXTURE_ONLY-${co.slug}-FY26-M1-M6-history.xlsx`;
    await writeXlsx(join(dir, file), [{ name: "MIS", rows }]);
    historyFiles.push({ company: co.name, slug: co.slug, file });
    console.log("wrote", co.slug, file);
  }

  const manifestPath = join(outRoot, "MANIFEST.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.historyGeneratedAt = new Date().toISOString().slice(0, 10);
    manifest.history = historyFiles;
    for (const h of historyFiles) {
      const cse = (manifest.cases || []).find((c) => c.slug === h.slug);
      if (cse && Array.isArray(cse.files) && !cse.files.includes(h.file)) {
        cse.files.push(h.file);
      }
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const readme = join(outRoot, "README.md");
  if (existsSync(readme)) {
    let text = readFileSync(readme, "utf8");
    if (!text.includes("FY26-M1-M6-history")) {
      text += `\n## Multi-month history packs\n\nEach company also has \`FIXTURE_ONLY-<slug>-FY26-M1-M6-history.xlsx\` (Apr–Sep 2025 / FY26 M1–M6) for runway, revenue trend, and Compare. Regenerated by \`node scripts/generate-fixture-history.mjs\`.\n`;
      writeFileSync(readme, text);
    }
  }

  console.log(`History packs: ${historyFiles.length} companies × 6 months`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
