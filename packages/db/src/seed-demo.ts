/**
 * FIXTURE_ONLY — opt-in labelled demo. Never run against a live book.
 *   SEED_DEMO=1 pnpm seed:demo
 */
import { randomUUID } from "node:crypto";
import { loadEnv } from "@venture-os/config";
import { toEur, toInrCrore } from "@venture-os/core";
import { eq } from "drizzle-orm";
import { getDb, withOrgRaw, closeDb } from "./client.js";
import {
  companies,
  connectors,
  documents,
  funds,
  inboxItems,
  metricValues,
  orgSettings,
  organization,
  positions,
  sourceRefs,
} from "./schema.js";

async function main() {
  const env = loadEnv();
  if (env.SEED_DEMO !== "1" && process.env.SEED_DEMO !== "1") {
    console.error("Refusing to seed. Set SEED_DEMO=1 to load FIXTURE_ONLY rows.");
    process.exit(1);
  }

  const db = getDb();
  const orgId = "org_fixture_only";
  const existing = await db.select().from(organization).where(eq(organization.id, orgId));
  if (!existing.length) {
    await db.insert(organization).values({
      id: orgId,
      name: "Fixture Capital (FIXTURE_ONLY)",
      slug: "fixture-capital-only",
      metadata: JSON.stringify({ fixtureOnly: true }),
    });
  }

  await withOrgRaw(orgId, async (tx) => {
    await tx
      .insert(orgSettings)
      .values({ orgId, fyStartMonth: 4, baseCurrency: "INR", displayCurrency: "EUR" })
      .onConflictDoNothing();

    await tx
      .insert(connectors)
      .values([
        { orgId, kind: "onedrive", status: "not_connected" },
        { orgId, kind: "affinity", status: "not_connected" },
        { orgId, kind: "granola", status: "not_connected" },
      ])
      .onConflictDoNothing();

    const [fund] = await tx
      .insert(funds)
      .values({
        orgId,
        name: "Fixture Fund I (FIXTURE_ONLY)",
        vintage: 2024,
        currency: "INR",
        committedCapital: 100,
      })
      .returning();

    const [co] = await tx
      .insert(companies)
      .values({
        orgId,
        name: "Fixture Apparel Co (FIXTURE_ONLY)",
        sector: "consumer",
        stage: "Series A",
        country: "IN",
        fyStartMonth: 4,
        unitHint: "crore",
        currencyHint: "INR",
      })
      .returning();

    await tx.insert(positions).values({
      orgId,
      fundId: fund!.id,
      companyId: co!.id,
      costBasis: 8,
      costCurrency: "INR",
      ownershipPct: 0.12,
      investedAt: "2024-06-01",
    });

    const docId = randomUUID();
    await tx.insert(documents).values({
      id: docId,
      orgId,
      companyId: co!.id,
      kind: "mis",
      filename: "FIXTURE_ONLY-mis-fy26-m5.xlsx",
      storageKey: "fixture/mis.xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      periodStart: "2025-08-01",
      periodEnd: "2025-08-31",
    });

    const refId = randomUUID();
    await tx.insert(sourceRefs).values({
      id: refId,
      orgId,
      documentId: docId,
      locator: { sheet: "MIS", cell: "B12" },
      excerpt: "FIXTURE_ONLY · Cash 4.2 (INR crore) · not a live book figure",
    });

    const fx = { fxRate: 0.011, fxDate: "2026-09-01", fxSource: "FIXTURE_RBI_SAMPLE" };
    await tx.insert(metricValues).values({
      orgId,
      companyId: co!.id,
      metricKey: "cash",
      periodStart: "2025-08-01",
      periodEnd: "2025-08-31",
      grain: "month",
      valueNumeric: 4.2,
      unit: "crore",
      currency: "INR",
      valueInrCrore: toInrCrore(4.2, "crore", "INR"),
      valueEur: toEur(4.2, "INR", fx),
      ...fx,
      sourceRefId: refId,
      version: 1,
      lane: "objective",
      confirmedBy: "fixture",
    });

    await tx.insert(inboxItems).values({
      orgId,
      companyId: co!.id,
      documentId: docId,
      sourceRefId: refId,
      kind: "metric",
      status: "pending",
      proposed: {
        metricKey: "burn",
        valueNumeric: 0.7,
        unit: "crore",
        currency: "INR",
        periodStart: "2025-08-01",
        periodEnd: "2025-08-31",
        grain: "month",
        fixtureOnly: true,
      },
      confidence: 0.74,
      locator: { sheet: "MIS", cell: "B14" },
      proposedBy: "system",
    });
  });

  console.log("FIXTURE_ONLY seed applied for org_fixture_only. Do not treat as the book.");
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
