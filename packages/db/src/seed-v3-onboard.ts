/**
 * V3 Ventures onboard seed — illustrative public corpus via real DB path.
 *   SEED_V3_ONBOARD=1 pnpm seed:v3-onboard
 */
import { randomUUID } from "node:crypto";
import { loadEnv } from "@venture-os/config";
import { parsePeriodHint, toEur, toInrCrore } from "@venture-os/core";
import { and, eq } from "drizzle-orm";
import { getDb, withOrgRaw, closeDb } from "./client.js";
import {
  commentary,
  companies,
  connectors,
  documents,
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
import { loadV3Corpus } from "./v3-onboard/load-corpus.js";
import {
  isOnboardSeedMetadata,
  mapCorpusMonthly,
  V3_ONBOARD_ORG_ID,
  V3_ONBOARD_ORG_NAME,
  V3_ONBOARD_ORG_SLUG,
} from "./v3-onboard/map.js";

const SEED_ACTOR = "v3-onboard-seed";

export async function seedV3Onboard(opts?: { env?: ReturnType<typeof loadEnv> }) {
  const env = opts?.env ?? loadEnv();
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: SEED_V3_ONBOARD is forbidden when NODE_ENV=production.");
  }
  if (env.SEED_V3_ONBOARD !== "1" && process.env.SEED_V3_ONBOARD !== "1") {
    throw new Error("Refusing to seed. Set SEED_V3_ONBOARD=1 to load onboard seed rows.");
  }

  const corpus = loadV3Corpus();
  const db = getDb();
  const orgId = V3_ONBOARD_ORG_ID;

  const [existingOrg] = await db.select().from(organization).where(eq(organization.id, orgId));
  if (existingOrg && !isOnboardSeedMetadata(existingOrg.metadata)) {
    throw new Error(`Refusing to seed: organisation ${orgId} exists and is not an onboard seed org.`);
  }

  if (!existingOrg) {
    await db.insert(organization).values({
      id: orgId,
      name: V3_ONBOARD_ORG_NAME,
      slug: V3_ONBOARD_ORG_SLUG,
      metadata: JSON.stringify({ onboardSeed: true, source: "public_corpus" }),
    });
  }

  const attachEmails = [
    env.SEED_DEMO_EMAIL || process.env.SEED_DEMO_EMAIL,
    env.SEED_V3_EMAIL || process.env.SEED_V3_EMAIL,
  ].filter(Boolean) as string[];

  for (const email of [...new Set(attachEmails)]) {
    const [u] = await db.select().from(user).where(eq(user.email, email));
    if (!u) {
      console.log(`No user for ${email} yet — sign up first, then re-run seed.`);
      continue;
    }
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
    console.log(`Attached ${email} as org_admin of ${V3_ONBOARD_ORG_NAME}.`);
  }

  await withOrgRaw(orgId, async (tx) => {
    const seeded = await tx
      .select()
      .from(companies)
      .where(eq(companies.orgId, orgId))
      .limit(1);
    if (seeded.length) {
      console.log("Onboard seed book already present — leaving as-is.");
      return;
    }

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

    const fundIdByCorpus = new Map<string, string>();
    for (const f of corpus.funds) {
      const [row] = await tx
        .insert(funds)
        .values({
          orgId,
          name: f.name,
          vintage: f.vintage,
          currency: f.currency,
          committedCapital: f.committedCapital,
        })
        .returning();
      fundIdByCorpus.set(f.id, row!.id);
    }

    const companyIdByCorpus = new Map<string, string>();
    const docIdByCorpus = new Map<string, string>();
    const refByDocPage = new Map<string, string>();

    for (const d of corpus.documents) {
      const coCorpusId = d.companyId;
      const docUuid = randomUUID();
      docIdByCorpus.set(d.id, docUuid);
      const mime =
        d.filename.endsWith(".pdf")
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      await tx.insert(documents).values({
        id: docUuid,
        orgId,
        companyId: null,
        kind: d.kind ?? "mis",
        filename: d.filename,
        storageKey: `v3-onboard/${d.filename}`,
        mime,
        periodStart: d.periodStart,
        periodEnd: d.periodEnd,
        source: "onboard_seed",
      });
      refByDocPage.set(`${d.id}:1`, randomUUID());
    }

    for (const co of corpus.companies) {
      const [row] = await tx
        .insert(companies)
        .values({
          orgId,
          name: co.name,
          sector: co.sector,
          stage: co.stage,
          country: co.country,
          fyStartMonth: 4,
          unitHint: co.unitHint,
          currencyHint: co.currencyHint,
        })
        .returning();
      companyIdByCorpus.set(co.id, row!.id);

      const fundId = fundIdByCorpus.get(co.fundId);
      if (!fundId) throw new Error(`Unknown fund ${co.fundId}`);

      const [pos] = await tx
        .insert(positions)
        .values({
          orgId,
          fundId,
          companyId: row!.id,
          costBasis: co.costBasis,
          costCurrency: co.costCurrency,
          ownershipPct: co.ownershipPct,
          investedAt: co.investedAt,
        })
        .returning();

      for (const d of corpus.documents.filter((x) => x.companyId === co.id)) {
        const docUuid = docIdByCorpus.get(d.id)!;
        await tx.update(documents).set({ companyId: row!.id }).where(eq(documents.id, docUuid));
      }

      for (const m of co.monthly) {
        const docUuid = docIdByCorpus.get(m.sourceDocumentId);
        if (!docUuid) continue;
        const refKey = `${m.sourceDocumentId}:${m.sourcePage ?? 1}`;
        let refId = refByDocPage.get(refKey);
        if (!refId) {
          refId = randomUUID();
          refByDocPage.set(refKey, refId);
          await tx.insert(sourceRefs).values({
            id: refId,
            orgId,
            documentId: docUuid,
            locator: m.sourcePage ? { page: m.sourcePage } : { sheet: "MIS" },
            excerpt: `${co.name} · ${m.period} · ONBOARD_SEED illustrative`,
          });
        }

        const mapped = mapCorpusMonthly(m, co.unitHint, co.currencyHint);
        for (const metric of mapped) {
          const fx = corpus.fx;
          await tx.insert(metricValues).values({
            orgId,
            companyId: row!.id,
            metricKey: metric.metricKey,
            periodStart: metric.periodStart,
            periodEnd: metric.periodEnd,
            grain: metric.grain,
            valueNumeric: metric.valueNumeric,
            unit: metric.unit,
            currency: metric.currency,
            valueInrCrore: toInrCrore(metric.valueNumeric, metric.unit, metric.currency),
            valueEur: toEur(metric.valueNumeric, metric.currency, fx),
            fxRate: fx.fxRate,
            fxDate: fx.fxDate,
            fxSource: fx.fxSource,
            sourceRefId: refId,
            version: 1,
            lane: "objective",
            confirmedBy: SEED_ACTOR,
          });
        }
      }

      if (co.mark && pos) {
        const doc = corpus.documents.find((d) => d.companyId === co.id);
        const docUuid = doc ? docIdByCorpus.get(doc.id) : undefined;
        let markRef: string | undefined;
        if (docUuid) {
          markRef = randomUUID();
          await tx.insert(sourceRefs).values({
            id: markRef,
            orgId,
            documentId: docUuid,
            locator: { kind: "mark", asOf: co.mark.asOf },
            excerpt: `${co.name} mark · ONBOARD_SEED illustrative`,
          });
        }
        await tx.insert(marks).values({
          orgId,
          positionId: pos.id,
          asOf: co.mark.asOf,
          method: co.mark.method,
          value: co.mark.value,
          currency: co.costCurrency,
          fxRate: corpus.fx.fxRate,
          fxDate: corpus.fx.fxDate,
          fxSource: corpus.fx.fxSource,
          sourceRefId: markRef ?? null,
          rationale: "Illustrative last-round mark for onboard seed",
          createdBy: SEED_ACTOR,
        });
      }

      for (const c of co.commentary ?? []) {
        const bounds = parsePeriodHint(c.period);
        if (!bounds) continue;
        let refId: string | null = null;
        if (c.sourceDocumentId) {
          const docUuid = docIdByCorpus.get(c.sourceDocumentId);
          if (docUuid) {
            refId = randomUUID();
            await tx.insert(sourceRefs).values({
              id: refId,
              orgId,
              documentId: docUuid,
              locator: c.sourcePage ? { page: c.sourcePage } : { sheet: "Notes" },
              excerpt: `${co.name} commentary · ONBOARD_SEED`,
            });
          }
        }
        if (c.objective) {
          await tx.insert(commentary).values({
            orgId,
            companyId: row!.id,
            periodStart: bounds.start,
            periodEnd: bounds.end,
            lane: "objective",
            body: c.objective,
            sourceRefId: refId,
            createdBy: SEED_ACTOR,
          });
        }
        if (c.subjective) {
          await tx.insert(commentary).values({
            orgId,
            companyId: row!.id,
            periodStart: bounds.start,
            periodEnd: bounds.end,
            lane: "subjective",
            body: c.subjective,
            sourceRefId: refId,
            createdBy: SEED_ACTOR,
          });
        }
      }
    }

    for (const item of corpus.pendingInbox) {
      const companyId = companyIdByCorpus.get(item.companyId);
      const documentId = docIdByCorpus.get(item.documentId);
      if (!companyId || !documentId) continue;
      const bounds = parsePeriodHint(item.period);
      if (!bounds) continue;
      const refId = randomUUID();
      await tx.insert(sourceRefs).values({
        id: refId,
        orgId,
        documentId,
        locator: item.locator,
        excerpt: `Pending inbox · ${item.metricKey} · ONBOARD_SEED`,
      });
      await tx.insert(inboxItems).values({
        orgId,
        companyId,
        documentId,
        sourceRefId: refId,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey: item.metricKey,
          valueNumeric: item.valueNumeric,
          unit: item.unit,
          currency: item.currency,
          periodStart: bounds.start,
          periodEnd: bounds.end,
          grain: "month",
          onboardSeed: true,
        },
        confidence: item.confidence,
        locator: item.locator,
        proposedBy: "system",
      });
    }
  });

  console.log(
    `Onboard seed applied for ${V3_ONBOARD_ORG_NAME} (${corpus.companies.length} companies). Not the live book.`,
  );
}

async function main() {
  await seedV3Onboard();
  await closeDb();
}

const entry = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entry.endsWith("seed-v3-onboard.ts") || entry.endsWith("seed-v3-onboard.js")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
