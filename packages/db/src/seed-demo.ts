/**
 * FIXTURE_ONLY — opt-in labelled demo. Never run against a live book.
 *   SEED_DEMO=1 pnpm seed:demo
 *
 * Seeds Confirm (pending inbox) + booked metrics that fire Flags detectors.
 * Safe to re-run: upserts portfolio rows and refreshes pending/flags for fixture cos.
 */
import { randomUUID } from "node:crypto";
import { loadEnv } from "@venture-os/config";
import { toEur, toInrCrore } from "@venture-os/core";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, withOrgRaw, closeDb } from "./client.js";
import { runFlagJob } from "./flags-job.js";
import {
  companies,
  connectors,
  documents,
  flagEvents,
  funds,
  inboxItems,
  member,
  metricValues,
  orgSettings,
  organization,
  positions,
  session,
  sourceRefs,
  user,
} from "./schema.js";

const FX = { fxRate: 0.011, fxDate: "2026-09-01", fxSource: "FIXTURE_RBI_SAMPLE" };

type CoSpec = {
  name: string;
  sector: string;
  stage: string;
  slug: string;
};

const PORTFOLIO: CoSpec[] = [
  { name: "Fixture Apparel Co (FIXTURE_ONLY)", sector: "consumer", stage: "Series A", slug: "fixture-apparel" },
  { name: "Salad Days", sector: "Food & drinks", stage: "Series A", slug: "salad-days" },
  { name: "Deconstruct", sector: "Wellness & beauty", stage: "Series B", slug: "deconstruct" },
  { name: "Go Zero", sector: "Food & drinks", stage: "Seed", slug: "go-zero" },
  { name: "The Hosteller", sector: "Lifestyle / travel", stage: "Series A", slug: "hosteller" },
];

async function ensureCompany(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  orgId: string,
  fundId: string,
  spec: CoSpec,
) {
  const existing = await tx.select().from(companies).where(eq(companies.name, spec.name));
  if (existing[0]) return existing[0];
  const [co] = await tx
    .insert(companies)
    .values({
      orgId,
      name: spec.name,
      sector: spec.sector,
      stage: spec.stage,
      country: "IN",
      fyStartMonth: 4,
      unitHint: "crore",
      currencyHint: "INR",
    })
    .returning();
  await tx.insert(positions).values({
    orgId,
    fundId,
    companyId: co!.id,
    costBasis: 5,
    costCurrency: "INR",
    ownershipPct: 0.1,
    investedAt: "2024-06-01",
  });
  return co!;
}

async function ensureDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  orgId: string,
  companyId: string,
  filename: string,
  periodStart: string,
  periodEnd: string,
) {
  const existing = await tx
    .select()
    .from(documents)
    .where(and(eq(documents.companyId, companyId), eq(documents.filename, filename)));
  if (existing[0]) return existing[0];
  const [doc] = await tx
    .insert(documents)
    .values({
      id: randomUUID(),
      orgId,
      companyId,
      kind: "mis",
      filename,
      storageKey: `fixture/${filename}`,
      mime: filename.endsWith(".csv")
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      periodStart,
      periodEnd,
    })
    .returning();
  return doc!;
}

async function ensureRef(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  orgId: string,
  documentId: string,
  cell: string,
  excerpt: string,
) {
  const existing = await tx
    .select()
    .from(sourceRefs)
    .where(and(eq(sourceRefs.documentId, documentId), eq(sourceRefs.excerpt, excerpt)));
  if (existing[0]) return existing[0];
  const [ref] = await tx
    .insert(sourceRefs)
    .values({
      id: randomUUID(),
      orgId,
      documentId,
      locator: { sheet: "MIS", cell },
      excerpt,
    })
    .returning();
  return ref!;
}

async function bookMetric(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  args: {
    orgId: string;
    companyId: string;
    sourceRefId: string;
    metricKey: string;
    value: number | null;
    periodStart: string;
    periodEnd: string;
    unit?: string;
    currency?: string;
  },
) {
  const unit = args.unit ?? "crore";
  const currency = args.currency ?? "INR";
  const prior = await tx
    .select()
    .from(metricValues)
    .where(
      and(
        eq(metricValues.companyId, args.companyId),
        eq(metricValues.metricKey, args.metricKey),
        eq(metricValues.periodEnd, args.periodEnd),
      ),
    );
  if (prior.length) {
    await tx
      .update(metricValues)
      .set({
        valueNumeric: args.value,
        unit,
        currency,
        valueInrCrore: args.value == null ? null : toInrCrore(args.value, unit as never, currency as never),
        valueEur: args.value == null ? null : toEur(args.value, currency as never, FX),
        ...FX,
        sourceRefId: args.sourceRefId,
        confirmedBy: "fixture",
      })
      .where(eq(metricValues.id, prior[0]!.id));
    return;
  }
  await tx.insert(metricValues).values({
    orgId: args.orgId,
    companyId: args.companyId,
    metricKey: args.metricKey,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    grain: "month",
    valueNumeric: args.value,
    unit,
    currency,
    valueInrCrore: args.value == null ? null : toInrCrore(args.value, unit as never, currency as never),
    valueEur: args.value == null ? null : toEur(args.value, currency as never, FX),
    ...FX,
    sourceRefId: args.sourceRefId,
    version: 1,
    lane: "objective",
    confirmedBy: "fixture",
  });
}

async function main() {
  const env = loadEnv();
  if (env.NODE_ENV === "production") {
    console.error("Refusing to seed: SEED_DEMO is forbidden when NODE_ENV=production.");
    process.exit(1);
  }
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

  const email = env.SEED_DEMO_EMAIL || process.env.SEED_DEMO_EMAIL;
  if (email) {
    const [u] = await db.select().from(user).where(eq(user.email, email));
    if (u) {
      const already = await db
        .select()
        .from(member)
        .where(and(eq(member.userId, u.id), eq(member.organizationId, orgId)));
      if (!already.length) {
        await db.insert(member).values({
          id: randomUUID(),
          organizationId: orgId,
          userId: u.id,
          role: "org_admin",
        });
      }
      await db.update(session).set({ activeOrganizationId: orgId }).where(eq(session.userId, u.id));
      console.log(`Attached ${email} as org_admin of Fixture Capital (FIXTURE_ONLY).`);
    } else {
      console.log(`No user for ${email} yet. Sign up first (pnpm demo:vc does this), then re-seed.`);
    }
  }

  const companyIds: string[] = [];

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

    let [fund] = await tx.select().from(funds).where(eq(funds.name, "Fixture Fund I (FIXTURE_ONLY)"));
    if (!fund) {
      [fund] = await tx
        .insert(funds)
        .values({
          orgId,
          name: "Fixture Fund I (FIXTURE_ONLY)",
          vintage: 2024,
          currency: "INR",
          committedCapital: 100,
        })
        .returning();
    }

    for (const spec of PORTFOLIO) {
      const co = await ensureCompany(tx, orgId, fund!.id, spec);
      companyIds.push(co.id);
    }

    const byName = new Map(
      (await tx.select().from(companies).where(inArray(companies.id, companyIds))).map((c) => [c.name, c]),
    );

    // —— Salad Days: short runway (~1.9 mo) + below plan (booked → Flags)
    {
      const co = byName.get("Salad Days")!;
      const doc = await ensureDoc(
        tx,
        orgId,
        co.id,
        "FIXTURE_ONLY-salad-days-below-plan.xlsx",
        "2026-07-01",
        "2026-07-31",
      );
      const ref = await ensureRef(
        tx,
        orgId,
        doc.id,
        "B2",
        "FIXTURE_ONLY · Salad Days M3 · invented below-plan pack",
      );
      const priorEnd = "2026-06-30";
      const curEnd = "2026-07-31";
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "cash",
        value: 1.6,
        periodStart: "2026-06-01",
        periodEnd: priorEnd,
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.3,
        periodStart: "2026-06-01",
        periodEnd: priorEnd,
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "net_revenue",
        value: 2.3,
        periodStart: "2026-06-01",
        periodEnd: priorEnd,
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "cash",
        value: 0.9,
        periodStart: "2026-07-01",
        periodEnd: curEnd,
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.48,
        periodStart: "2026-07-01",
        periodEnd: curEnd,
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "net_revenue",
        value: 1.7,
        periodStart: "2026-07-01",
        periodEnd: curEnd,
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "plan_revenue",
        value: 2.8,
        periodStart: "2026-07-01",
        periodEnd: curEnd,
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "gross_margin_pct",
        value: 0.41,
        periodStart: "2026-07-01",
        periodEnd: curEnd,
        unit: "percent",
        currency: "INR",
      });
    }

    // —— Deconstruct: prior cash booked, current cash missing → cash_unreported
    {
      const co = byName.get("Deconstruct")!;
      const doc = await ensureDoc(
        tx,
        orgId,
        co.id,
        "FIXTURE_ONLY-deconstruct-missing-cash.xlsx",
        "2026-08-01",
        "2026-08-31",
      );
      const ref = await ensureRef(
        tx,
        orgId,
        doc.id,
        "B2",
        "FIXTURE_ONLY · Deconstruct · missing cash is not zero",
      );
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "cash",
        value: 1.6,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "net_revenue",
        value: 5.6,
        periodStart: "2026-08-01",
        periodEnd: "2026-08-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.4,
        periodStart: "2026-08-01",
        periodEnd: "2026-08-31",
      });
      // Explicit null cash for the latest period — missing ≠ 0 (cash_unreported).
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "cash",
        value: null,
        periodStart: "2026-08-01",
        periodEnd: "2026-08-31",
      });
    }

    // —— Hosteller: burn up + short runway (~3.6 mo)
    {
      const co = byName.get("The Hosteller")!;
      const doc = await ensureDoc(
        tx,
        orgId,
        co.id,
        "FIXTURE_ONLY-hosteller-Aug2025-lakhs.xlsx",
        "2026-07-01",
        "2026-07-31",
      );
      const ref = await ensureRef(tx, orgId, doc.id, "B4", "FIXTURE_ONLY · Hosteller · burn stress");
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.28,
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.5,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "cash",
        value: 1.8,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "net_revenue",
        value: 2.0,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
    }

    // —— Apparel: healthy long runway (~16.8 mo) + pending Confirm burn
    {
      const co = byName.get("Fixture Apparel Co (FIXTURE_ONLY)")!;
      const doc = await ensureDoc(tx, orgId, co.id, "FIXTURE_ONLY-mis-fy26-m5.xlsx", "2026-07-01", "2026-07-31");
      const ref = await ensureRef(
        tx,
        orgId,
        doc.id,
        "B12",
        "FIXTURE_ONLY · Cash 4.2 (INR crore) · not a live book figure",
      );
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "cash",
        value: 4.2,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.25,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "net_revenue",
        value: 3.1,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
    }

    // —— Go Zero: mid runway (~8.8 mo); ambiguous-unit row stays in Confirm
    {
      const co = byName.get("Go Zero")!;
      const doc = await ensureDoc(
        tx,
        orgId,
        co.id,
        "FIXTURE_ONLY-go-zero-booked-base.xlsx",
        "2026-07-01",
        "2026-07-31",
      );
      const ref = await ensureRef(tx, orgId, doc.id, "B3", "FIXTURE_ONLY · Go Zero · booked base pack");
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "cash",
        value: 3.5,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.4,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "net_revenue",
        value: 1.2,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
    }

    // Refresh pending Confirm queue for fixture companies (delete prior pending, reinsert).
    await tx
      .delete(inboxItems)
      .where(and(eq(inboxItems.orgId, orgId), eq(inboxItems.status, "pending"), inArray(inboxItems.companyId, companyIds)));

    const salad = byName.get("Salad Days")!;
    const saladDoc = (
      await tx
        .select()
        .from(documents)
        .where(and(eq(documents.companyId, salad.id), eq(documents.filename, "FIXTURE_ONLY-salad-days-below-plan.xlsx")))
    )[0]!;
    const go = byName.get("Go Zero")!;
    const goDoc = await ensureDoc(tx, orgId, go.id, "FIXTURE_ONLY-go-zero-ambiguous-units.xlsx", "2026-07-01", "2026-07-31");
    const goRef = await ensureRef(tx, orgId, goDoc.id, "B2", "FIXTURE_ONLY · Go Zero · ambiguous units");
    const deco = byName.get("Deconstruct")!;
    const decoDoc = (
      await tx
        .select()
        .from(documents)
        .where(and(eq(documents.companyId, deco.id), eq(documents.filename, "FIXTURE_ONLY-deconstruct-missing-cash.xlsx")))
    )[0]!;
    const apparel = byName.get("Fixture Apparel Co (FIXTURE_ONLY)")!;
    const apparelDoc = (
      await tx
        .select()
        .from(documents)
        .where(and(eq(documents.companyId, apparel.id), eq(documents.filename, "FIXTURE_ONLY-mis-fy26-m5.xlsx")))
    )[0]!;

    await tx.insert(inboxItems).values([
      {
        orgId,
        companyId: apparel.id,
        documentId: apparelDoc.id,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey: "burn",
          valueNumeric: 0.7,
          unit: "crore",
          currency: "INR",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-31",
          grain: "month",
          fixtureOnly: true,
        },
        confidence: 0.74,
        locator: { sheet: "MIS", cell: "B14", excerpt: "Burn 0.7 Cr" },
        proposedBy: "system",
      },
      {
        orgId,
        companyId: apparel.id,
        documentId: apparelDoc.id,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey: "net_revenue",
          valueNumeric: 3.1,
          unit: "crore",
          currency: "INR",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-31",
          grain: "month",
          fixtureOnly: true,
        },
        confidence: 0.81,
        locator: { sheet: "MIS", cell: "B10", excerpt: "Net revenue 3.1 Cr" },
        proposedBy: "system",
      },
      {
        orgId,
        companyId: go.id,
        documentId: goDoc.id,
        sourceRefId: goRef.id,
        kind: "unit_ambiguity",
        status: "pending",
        proposed: {
          metricKey: "cash",
          valueNumeric: 1.1,
          unit: "unknown",
          currency: "INR",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-31",
          grain: "month",
          fixtureOnly: true,
          label: "Cash (units unclear)",
        },
        confidence: 0.55,
        locator: { sheet: "Sheet1", cell: "B3", excerpt: "Cash 1.1 — no unit token" },
        proposedBy: "system",
      },
      {
        orgId,
        companyId: go.id,
        documentId: goDoc.id,
        kind: "unit_ambiguity",
        status: "pending",
        proposed: {
          metricKey: "net_revenue",
          valueNumeric: 2.4,
          unit: "unknown",
          currency: "INR",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-31",
          grain: "month",
          fixtureOnly: true,
          label: "Revenue (units unclear)",
        },
        confidence: 0.52,
        locator: { sheet: "Sheet1", cell: "B2", excerpt: "Revenue 2.4 — no unit token" },
        proposedBy: "system",
      },
      {
        orgId,
        companyId: salad.id,
        documentId: saladDoc.id,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey: "headcount",
          valueNumeric: 55,
          unit: "unit",
          currency: "INR",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-31",
          grain: "month",
          fixtureOnly: true,
        },
        confidence: 0.88,
        locator: { sheet: "Performance", cell: "B9", excerpt: "Headcount 55" },
        proposedBy: "system",
      },
      {
        orgId,
        companyId: deco.id,
        documentId: decoDoc.id,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey: "gross_margin_pct",
          valueNumeric: 0.68,
          unit: "percent",
          currency: "INR",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          grain: "month",
          fixtureOnly: true,
        },
        confidence: 0.79,
        locator: { sheet: "Monthly MIS", cell: "B3", excerpt: "Gross margin % 68" },
        proposedBy: "system",
      },
    ]);

    // Clear open flags for these cos so recompute is clean.
    await tx
      .update(flagEvents)
      .set({ status: "cleared" })
      .where(and(eq(flagEvents.orgId, orgId), inArray(flagEvents.companyId, companyIds), eq(flagEvents.status, "open")));
  });

  let raised = 0;
  for (const id of companyIds) {
    const r = await runFlagJob(orgId, id);
    raised += r.raised;
  }
  console.log(
    `FIXTURE_ONLY seed applied for org_fixture_only · pending Confirm rows refreshed · flags raised=${raised}. Do not treat as the book.`,
  );
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
