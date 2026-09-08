/**
 * FIXTURE_ONLY — opt-in labelled demo. Never run against a live book.
 *   SEED_DEMO=1 pnpm seed:demo
 *
 * Seeds:
 * - Confirm: pending metric / unit_ambiguity / commentary rows
 * - Booked metrics that fire Flags detectors (runway, burn, plan, cash missing, …)
 * - Provenanced NAV marks for last calendar quarter + prior (rollup, bridge, MOIC)
 *
 * Safe to re-run: upserts portfolio rows and refreshes pending/flags/marks for fixture cos.
 */
import { randomUUID } from "node:crypto";
import { loadEnv } from "@venture-os/config";
import { toEur, toInrCrore, defaultPriorAsOf, lastCalendarQuarterEnd } from "@venture-os/core";
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
  marks,
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

/** Default NAV page as-of (last calendar quarter) + prior for PoP bridge. */
const NAV_AS_OF = lastCalendarQuarterEnd(new Date("2026-09-08"));
const NAV_PRIOR_AS_OF = defaultPriorAsOf(NAV_AS_OF);

type CoSpec = {
  name: string;
  sector: string;
  stage: string;
  slug: string;
  costBasis: number;
  ownershipPct: number;
  investedAt: string;
  /** Fair value of the position (INR crore), prior then current quarter. */
  markPrior: number;
  markCurrent: number;
};

const PORTFOLIO: CoSpec[] = [
  {
    name: "Fixture Apparel Co (FIXTURE_ONLY)",
    sector: "consumer",
    stage: "Series A",
    slug: "fixture-apparel",
    costBasis: 5,
    ownershipPct: 0.12,
    investedAt: "2024-06-01",
    markPrior: 6.2,
    markCurrent: 7.1,
  },
  {
    name: "Salad Days",
    sector: "Food & drinks",
    stage: "Series A",
    slug: "salad-days",
    costBasis: 3.2,
    ownershipPct: 0.14,
    investedAt: "2024-03-15",
    markPrior: 2.9,
    markCurrent: 2.45,
  },
  {
    name: "Deconstruct",
    sector: "Wellness & beauty",
    stage: "Series B",
    slug: "deconstruct",
    costBasis: 8,
    ownershipPct: 0.08,
    investedAt: "2023-11-01",
    markPrior: 11.2,
    markCurrent: 12.6,
  },
  {
    name: "Go Zero",
    sector: "Food & drinks",
    stage: "Seed",
    slug: "go-zero",
    costBasis: 1.8,
    ownershipPct: 0.18,
    investedAt: "2025-01-20",
    markPrior: 2.0,
    markCurrent: 2.35,
  },
  {
    name: "The Hosteller",
    sector: "Lifestyle / travel",
    stage: "Series A",
    slug: "hosteller",
    costBasis: 4.5,
    ownershipPct: 0.1,
    investedAt: "2024-08-01",
    markPrior: 5.4,
    markCurrent: 5.9,
  },
];

async function ensureCompany(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  orgId: string,
  fundId: string,
  spec: CoSpec,
) {
  const existing = await tx.select().from(companies).where(eq(companies.name, spec.name));
  let co = existing[0];
  if (!co) {
    const [created] = await tx
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
    co = created!;
  } else {
    await tx
      .update(companies)
      .set({ sector: spec.sector, stage: spec.stage })
      .where(eq(companies.id, co.id));
  }
  const [pos] = await tx.select().from(positions).where(eq(positions.companyId, co.id));
  if (!pos) {
    await tx.insert(positions).values({
      orgId,
      fundId,
      companyId: co.id,
      costBasis: spec.costBasis,
      costCurrency: "INR",
      ownershipPct: spec.ownershipPct,
      investedAt: spec.investedAt,
    });
  } else {
    await tx
      .update(positions)
      .set({
        costBasis: spec.costBasis,
        ownershipPct: spec.ownershipPct,
        investedAt: spec.investedAt,
        fundId,
      })
      .where(eq(positions.id, pos.id));
  }
  return co;
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

async function bookMark(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  args: {
    orgId: string;
    positionId: string;
    asOf: string;
    value: number;
    sourceRefId: string;
    rationale: string;
  },
) {
  const prior = await tx
    .select()
    .from(marks)
    .where(and(eq(marks.positionId, args.positionId), eq(marks.asOf, args.asOf)));
  if (prior.length) {
    await tx
      .update(marks)
      .set({
        value: args.value,
        currency: "INR",
        method: "last_round",
        rationale: args.rationale,
        sourceRefId: args.sourceRefId,
        ...FX,
        createdBy: "fixture",
      })
      .where(eq(marks.id, prior[0]!.id));
    return;
  }
  await tx.insert(marks).values({
    orgId: args.orgId,
    positionId: args.positionId,
    asOf: args.asOf,
    method: "last_round",
    value: args.value,
    currency: "INR",
    rationale: args.rationale,
    sourceRefId: args.sourceRefId,
    ...FX,
    createdBy: "fixture",
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

    // —— Salad Days: very short runway (~1.3 mo) + below plan (booked → Flags)
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
        value: 1.1,
        periodStart: "2026-06-01",
        periodEnd: priorEnd,
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.45,
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
        value: 0.7,
        periodStart: "2026-07-01",
        periodEnd: curEnd,
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.55,
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
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "headcount",
        value: 62,
        periodStart: "2026-06-01",
        periodEnd: priorEnd,
        unit: "unit",
        currency: "INR",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "headcount",
        value: 51,
        periodStart: "2026-07-01",
        periodEnd: curEnd,
        unit: "unit",
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

    // —— Hosteller: short-mid runway (~3.3 mo) + rising burn
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
        value: 0.4,
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
        value: 1.5,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "net_revenue",
        value: 2.15,
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
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
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "gross_margin_pct",
        value: 0.48,
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        unit: "percent",
        currency: "INR",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "gross_margin_pct",
        value: 0.41,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
        unit: "percent",
        currency: "INR",
      });
    }

    // —— Apparel: long runway (~27 mo) + pending Confirm burn
    {
      const co = byName.get("Fixture Apparel Co (FIXTURE_ONLY)")!;
      const doc = await ensureDoc(tx, orgId, co.id, "FIXTURE_ONLY-mis-fy26-m5.xlsx", "2026-07-01", "2026-07-31");
      const ref = await ensureRef(
        tx,
        orgId,
        doc.id,
        "B12",
        "FIXTURE_ONLY · Cash 7.5 (INR crore) · not a live book figure",
      );
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "cash",
        value: 7.5,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.28,
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

    // —— Go Zero: mid runway (~8 mo); ambiguous-unit row stays in Confirm
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
        value: 2.8,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      });
      await bookMetric(tx, {
        orgId,
        companyId: co.id,
        sourceRefId: ref.id,
        metricKey: "burn",
        value: 0.35,
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
    const host = byName.get("The Hosteller")!;
    const hostDoc = (
      await tx
        .select()
        .from(documents)
        .where(and(eq(documents.companyId, host.id), eq(documents.filename, "FIXTURE_ONLY-hosteller-Aug2025-lakhs.xlsx")))
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
        companyId: apparel.id,
        documentId: apparelDoc.id,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey: "cash",
          valueNumeric: 7.8,
          unit: "crore",
          currency: "INR",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          grain: "month",
          fixtureOnly: true,
        },
        confidence: 0.86,
        locator: { sheet: "MIS", cell: "C12", excerpt: "Cash 7.8 Cr (M6 draft)" },
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
        companyId: go.id,
        documentId: goDoc.id,
        kind: "unit_ambiguity",
        status: "pending",
        proposed: {
          metricKey: "burn",
          valueNumeric: 0.9,
          unit: "unknown",
          currency: "INR",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-31",
          grain: "month",
          fixtureOnly: true,
          label: "Burn (units unclear)",
        },
        confidence: 0.48,
        locator: { sheet: "Sheet1", cell: "B4", excerpt: "Burn 0.9 — no unit token" },
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
        companyId: salad.id,
        documentId: saladDoc.id,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey: "plan_revenue",
          valueNumeric: 2.9,
          unit: "crore",
          currency: "INR",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          grain: "month",
          fixtureOnly: true,
        },
        confidence: 0.77,
        locator: { sheet: "Performance", cell: "C6", excerpt: "Plan revenue 2.9 Cr" },
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
      {
        orgId,
        companyId: host.id,
        documentId: hostDoc.id,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey: "cash",
          valueNumeric: 1.35,
          unit: "crore",
          currency: "INR",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          grain: "month",
          fixtureOnly: true,
        },
        confidence: 0.83,
        locator: { sheet: "MIS", cell: "B5", excerpt: "Cash 1.35 Cr" },
        proposedBy: "system",
      },
      {
        orgId,
        companyId: host.id,
        documentId: hostDoc.id,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey: "burn",
          valueNumeric: 0.52,
          unit: "crore",
          currency: "INR",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          grain: "month",
          fixtureOnly: true,
        },
        confidence: 0.8,
        locator: { sheet: "MIS", cell: "B6", excerpt: "Burn 0.52 Cr" },
        proposedBy: "system",
      },
      {
        orgId,
        companyId: host.id,
        documentId: hostDoc.id,
        kind: "commentary",
        status: "pending",
        proposed: {
          lane: "subjective",
          body: "FIXTURE_ONLY · Partner call: occupancy soft in Aug; watch burn vs. openings.",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          fixtureOnly: true,
        },
        confidence: 0.7,
        locator: { excerpt: "Partner call note · not from MIS" },
        proposedBy: "system",
      },
    ]);

    // —— NAV marks (provenanced) for default quarter + prior so rollup/bridge/MOIC work
    const portfolioPositionIds: string[] = [];
    for (const spec of PORTFOLIO) {
      const co = byName.get(spec.name)!;
      const [pos] = await tx.select().from(positions).where(eq(positions.companyId, co.id));
      if (pos) portfolioPositionIds.push(pos.id);
    }
    if (portfolioPositionIds.length) {
      await tx.delete(marks).where(inArray(marks.positionId, portfolioPositionIds));
    }
    for (const spec of PORTFOLIO) {
      const co = byName.get(spec.name)!;
      const doc = await ensureDoc(
        tx,
        orgId,
        co.id,
        `FIXTURE_ONLY-nav-pack-${spec.slug}.xlsx`,
        NAV_PRIOR_AS_OF,
        NAV_AS_OF,
      );
      const [pos] = await tx.select().from(positions).where(eq(positions.companyId, co.id));
      if (!pos) continue;
      const priorRef = await ensureRef(
        tx,
        orgId,
        doc.id,
        "M1",
        `FIXTURE_ONLY · ${spec.name} mark ${NAV_PRIOR_AS_OF} · ${spec.markPrior} Cr`,
      );
      const curRef = await ensureRef(
        tx,
        orgId,
        doc.id,
        "M2",
        `FIXTURE_ONLY · ${spec.name} mark ${NAV_AS_OF} · ${spec.markCurrent} Cr`,
      );
      await bookMark(tx, {
        orgId,
        positionId: pos.id,
        asOf: NAV_PRIOR_AS_OF,
        value: spec.markPrior,
        sourceRefId: priorRef.id,
        rationale: `FIXTURE_ONLY last_round mark as of ${NAV_PRIOR_AS_OF}`,
      });
      await bookMark(tx, {
        orgId,
        positionId: pos.id,
        asOf: NAV_AS_OF,
        value: spec.markCurrent,
        sourceRefId: curRef.id,
        rationale: `FIXTURE_ONLY last_round mark as of ${NAV_AS_OF}`,
      });
    }

    // Clear all open flags in the fixture org, then recompute for portfolio cos only.
    await tx
      .update(flagEvents)
      .set({ status: "cleared" })
      .where(and(eq(flagEvents.orgId, orgId), eq(flagEvents.status, "open")));
  });

  let raised = 0;
  for (const id of companyIds) {
    const r = await runFlagJob(orgId, id);
    raised += r.raised;
  }

  // Sanity: Confirm / Flags / NAV tables must be non-empty after seed.
  const pending = await withOrgRaw(orgId, async (tx) =>
    tx.select().from(inboxItems).where(and(eq(inboxItems.orgId, orgId), eq(inboxItems.status, "pending"))),
  );
  const openFlags = await withOrgRaw(orgId, async (tx) =>
    tx
      .select()
      .from(flagEvents)
      .where(and(eq(flagEvents.orgId, orgId), eq(flagEvents.status, "open"), inArray(flagEvents.companyId, companyIds))),
  );
  const markRows = await withOrgRaw(orgId, async (tx) => tx.select().from(marks).where(eq(marks.orgId, orgId)));
  const flagKeys = [...new Set(openFlags.map((f) => f.flagKey))].sort();
  console.log(
    `FIXTURE_ONLY seed applied for org_fixture_only · confirm_pending=${pending.length} · flags_open=${openFlags.length} (${flagKeys.join(", ")}) · marks=${markRows.length} · asOf=${NAV_AS_OF} prior=${NAV_PRIOR_AS_OF}. Do not treat as the book.`,
  );
  if (pending.length < 8 || openFlags.length < 4 || markRows.length < 8) {
    console.error("FIXTURE_ONLY seed underfilled Confirm/Flags/NAV — check detectors and mark upserts.");
    process.exit(1);
  }
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
