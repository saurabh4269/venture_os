/**
 * V3 Ventures onboard seed — illustrative public corpus via real DB path.
 *   SEED_V3_ONBOARD=1 pnpm seed:v3-onboard
 */
import { randomUUID } from "node:crypto";
import { loadEnv } from "@venture-os/config";
import { toEur, toInrCrore } from "@venture-os/core";
import { and, eq } from "drizzle-orm";
import { getDb, withOrgRaw, closeDb } from "./client.js";
import {
  commentary,
  companies,
  connectors,
  documentChunks,
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
  fxTripleFromCorpus,
  geoToCountry,
  isOnboardSeedMetadata,
  mapCorpusMonthly,
  mapInboxFieldKey,
  normalizeMoneyValue,
  parseCorpusPeriod,
  type HeisenbugInbox,
  type HeisenbugInboxField,
  V3_ONBOARD_ORG_ID,
  V3_ONBOARD_ORG_NAME,
  V3_ONBOARD_ORG_SLUG,
} from "./v3-onboard/map.js";

const SEED_ACTOR = "v3-onboard-seed";

function firstMappableInboxField(inbox: HeisenbugInbox): HeisenbugInboxField | null {
  for (const field of inbox.fields) {
    if (mapInboxFieldKey(field.key)) return field;
  }
  return null;
}

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
  const asOf = corpus.asOf ?? corpus.generatedAt ?? new Date().toISOString().slice(0, 10);

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
    const seeded = await tx.select().from(companies).where(eq(companies.orgId, orgId)).limit(1);
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
          vintage: f.vintage ?? null,
          currency: f.currency,
          committedCapital: f.deployed?.amount ? f.deployed.amount / 10_000_000 : null,
        })
        .returning();
      fundIdByCorpus.set(f.id, row!.id);
    }

    const companyIdByCorpus = new Map<string, string>();
    const docIdByCorpus = new Map<string, string>();

    for (const d of corpus.documents) {
      const docUuid = randomUUID();
      docIdByCorpus.set(d.id, docUuid);
      const period = d.date?.match(/^(\d{4}-\d{2})/)?.[1];
      const bounds = period ? parseCorpusPeriod(`${period}-01`) : null;
      await tx.insert(documents).values({
        id: docUuid,
        orgId,
        companyId: null,
        kind: d.type ?? "mis",
        filename: d.fileName ?? `${d.id}.pdf`,
        storageKey: `v3-onboard/${d.fileName ?? d.id}`,
        mime: (d.fileName ?? "").endsWith(".xlsx")
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
        periodStart: bounds?.start ?? null,
        periodEnd: bounds?.end ?? null,
        source: "onboard_seed",
      });
    }

    for (const co of corpus.companies) {
      const currency = co.currency ?? "INR";
      const [row] = await tx
        .insert(companies)
        .values({
          orgId,
          name: co.name,
          legalName: co.legalName ?? null,
          sector: co.sector ?? co.subSector ?? null,
          stage: co.stage ?? null,
          country: geoToCountry(co.geo) ?? null,
          website: co.website ?? null,
          fyStartMonth: 4,
          unitHint: currency === "INR" ? "crore" : "million",
          currencyHint: currency,
          status: co.status === "Exited" ? "exited" : "active",
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
          costBasis: co.cost?.amount
            ? currency === "INR"
              ? co.cost.amount / 10_000_000
              : co.cost.amount / 1_000_000
            : null,
          costCurrency: co.cost?.currency ?? currency,
          ownershipPct: co.ownershipFd ?? null,
          investedAt: co.founded ? `${co.founded}-06-01` : null,
        })
        .returning();

      for (const d of corpus.documents.filter((x) => x.companyId === co.id)) {
        const docUuid = docIdByCorpus.get(d.id)!;
        await tx.update(documents).set({ companyId: row!.id }).where(eq(documents.id, docUuid));

        for (const ex of d.excerpts ?? []) {
          const refId = randomUUID();
          await tx.insert(sourceRefs).values({
            id: refId,
            orgId,
            documentId: docUuid,
            locator: { page: ex.page, heading: ex.heading },
            excerpt: ex.text,
          });
          await tx.insert(documentChunks).values({
            orgId,
            documentId: docUuid,
            sourceRefId: refId,
            body: ex.text,
          });
        }
      }

      for (const m of co.monthly ?? []) {
        const docUuid = docIdByCorpus.get(m.sourceDocumentId);
        if (!docUuid) continue;
        const refId = randomUUID();
        await tx.insert(sourceRefs).values({
          id: refId,
          orgId,
          documentId: docUuid,
          locator: m.sourcePage ? { page: m.sourcePage } : { sheet: "MIS" },
          excerpt: `${co.name} · ${m.period} · ONBOARD_SEED illustrative`,
        });

        const fx = fxTripleFromCorpus(corpus.fx, asOf, currency);
        for (const metric of mapCorpusMonthly(m, currency)) {
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

      const latestMark = co.marks?.[co.marks.length - 1];
      const markSource = latestMark ?? (co.fairValue?.amount
        ? { asOf: asOf.length === 7 ? `${asOf}-28` : asOf, method: "last_round", fairValue: co.fairValue, rationale: "Corpus fair value" }
        : null);
      if (markSource && pos) {
        const doc = corpus.documents.find((d) => d.companyId === co.id);
        const docUuid = doc ? docIdByCorpus.get(doc.id) : undefined;
        let markRef: string | undefined;
        if (docUuid) {
          markRef = randomUUID();
          await tx.insert(sourceRefs).values({
            id: markRef,
            orgId,
            documentId: docUuid,
            locator: { kind: "mark", asOf: markSource.asOf },
            excerpt: `${co.name} mark · ONBOARD_SEED illustrative`,
          });
        }
        const fv = markSource.fairValue ?? co.fairValue;
        const markCurrency = fv?.currency ?? currency;
        const fx = fxTripleFromCorpus(corpus.fx, markSource.asOf, markCurrency);
        await tx.insert(marks).values({
          orgId,
          positionId: pos.id,
          asOf: markSource.asOf,
          method: markSource.method,
          value: fv?.amount
            ? markCurrency === "INR"
              ? fv.amount / 10_000_000
              : fv.amount / 1_000_000
            : null,
          currency: markCurrency,
          fxRate: fx.fxRate,
          fxDate: fx.fxDate,
          fxSource: fx.fxSource,
          sourceRefId: markRef ?? null,
          rationale: markSource.rationale ?? "Illustrative mark for onboard seed",
          createdBy: SEED_ACTOR,
        });
      }

      const doc = corpus.documents.find((d) => d.companyId === co.id);
      const objectiveExcerpt = doc?.excerpts?.find((e) => /P&L|KPI|snapshot/i.test(e.heading ?? ""));
      const subjectiveExcerpt = doc?.excerpts?.find((e) => /call|commentary|narrative/i.test(e.heading ?? ""));
      const periodBounds = parseCorpusPeriod(asOf.length === 7 ? asOf : asOf.slice(0, 7));
      if (objectiveExcerpt && periodBounds) {
        const refId = randomUUID();
        const docUuid = docIdByCorpus.get(doc!.id)!;
        await tx.insert(sourceRefs).values({
          id: refId,
          orgId,
          documentId: docUuid,
          locator: { page: objectiveExcerpt.page },
          excerpt: objectiveExcerpt.text,
        });
        await tx.insert(commentary).values({
          orgId,
          companyId: row!.id,
          periodStart: periodBounds.start,
          periodEnd: periodBounds.end,
          lane: "objective",
          body: objectiveExcerpt.text,
          sourceRefId: refId,
          createdBy: SEED_ACTOR,
        });
      }
      if (subjectiveExcerpt && periodBounds) {
        const refId = randomUUID();
        const docUuid = docIdByCorpus.get(doc!.id)!;
        await tx.insert(sourceRefs).values({
          id: refId,
          orgId,
          documentId: docUuid,
          locator: { page: subjectiveExcerpt.page },
          excerpt: subjectiveExcerpt.text,
        });
        await tx.insert(commentary).values({
          orgId,
          companyId: row!.id,
          periodStart: periodBounds.start,
          periodEnd: periodBounds.end,
          lane: "subjective",
          body: subjectiveExcerpt.text,
          sourceRefId: refId,
          createdBy: SEED_ACTOR,
        });
      }
    }

    for (const inbox of corpus.inbox.filter((i) => i.status === "pending")) {
      const companyId = companyIdByCorpus.get(inbox.companyId);
      if (!companyId) continue;
      const field = firstMappableInboxField(inbox);
      if (!field) continue;
      const metricKey = mapInboxFieldKey(field.key)!;
      const co = corpus.companies.find((c) => c.id === inbox.companyId);
      const currency = field.unit === "INR" ? "INR" : co?.currency ?? "INR";
      const bounds = field.period ? parseCorpusPeriod(field.period) : null;
      if (!bounds) continue;

      const docUuid = randomUUID();
      await tx.insert(documents).values({
        id: docUuid,
        orgId,
        companyId,
        kind: inbox.type ?? "mis",
        filename: inbox.fileName,
        storageKey: `v3-onboard/inbox/${inbox.fileName}`,
        mime: inbox.fileName.endsWith(".xlsx")
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
        periodStart: bounds.start,
        periodEnd: bounds.end,
        source: "onboard_seed",
      });

      const refId = randomUUID();
      await tx.insert(sourceRefs).values({
        id: refId,
        orgId,
        documentId: docUuid,
        locator: field.page ? { page: field.page } : {},
        excerpt: field.excerpt ?? `${inbox.fileName} · pending inbox`,
      });

      const normalized = normalizeMoneyValue(Number(field.value), currency, metricKey);
      await tx.insert(inboxItems).values({
        orgId,
        companyId,
        documentId: docUuid,
        sourceRefId: refId,
        kind: "metric",
        status: "pending",
        proposed: {
          metricKey,
          valueNumeric: normalized.valueNumeric,
          unit: normalized.unit,
          currency: normalized.currency,
          periodStart: bounds.start,
          periodEnd: bounds.end,
          grain: "month",
          onboardSeed: true,
        },
        confidence: field.confidence ?? 0.7,
        locator: field.page ? { page: field.page } : {},
        proposedBy: "system",
      });
    }

    for (const profile of corpus.publicProfiles ?? []) {
      await tx.insert(companies).values({
        orgId,
        name: profile.name,
        sector: profile.sector ?? null,
        country: profile.country ?? null,
        website: profile.website ?? null,
        fyStartMonth: 4,
        status: "active",
      });
    }
  });

  const bookCount = corpus.companies.length;
  const profileCount = corpus.publicProfiles?.length ?? 0;
  console.log(
    `Onboard seed applied for ${V3_ONBOARD_ORG_NAME} (${bookCount} book + ${profileCount} public-profile companies). Not the live book.`,
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
