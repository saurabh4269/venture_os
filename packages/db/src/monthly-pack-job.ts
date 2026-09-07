import {
  buildMonthlyPackRow,
  buildOnePagerMetrics,
  FLAG_CATALOG,
  objectiveBook,
} from "@venture-os/core";
import { eq } from "drizzle-orm";
import { getDb, withOrg } from "./client.js";
import { commentary, companies, flagEvents, metricValues, organization, orgSettings, reports } from "./schema.js";
import { recordOpsEvent } from "./ops.js";

function priorMonthEnd(asOf = new Date()): string {
  const y = asOf.getUTCFullYear();
  const m = asOf.getUTCMonth();
  const d = new Date(Date.UTC(y, m, 0));
  return d.toISOString().slice(0, 10);
}

/** Draft a monthly pack for one org from the confirmed book. Returns report row. */
export async function draftMonthlyPackForOrg(orgId: string, periodEnd?: string) {
  const pinPeriod = periodEnd || priorMonthEnd();
  return withOrg(orgId, async (tx) => {
    const cos = await tx.select().from(companies);
    const metrics = await tx.select().from(metricValues);
    const notes = await tx.select().from(commentary);
    const openFlags = await tx.select().from(flagEvents).where(eq(flagEvents.status, "open"));
    const pages = cos.map((co) => {
      const bookMetrics = objectiveBook(
        metrics.filter((m) => m.companyId === co.id && (!pinPeriod || m.periodEnd === pinPeriod)),
      ).map((m) => ({
        metricKey: m.metricKey,
        valueNumeric: m.valueNumeric,
        unit: m.unit,
        currency: m.currency,
        periodEnd: m.periodEnd,
        sourceRefId: m.sourceRefId,
        valueEur: m.valueEur,
        fxRate: m.fxRate,
        fxDate: m.fxDate,
        fxSource: m.fxSource,
        lane: m.lane,
      }));
      const curated = buildOnePagerMetrics(bookMetrics);
      const obj = notes.filter(
        (n) => n.companyId === co.id && n.lane === "objective" && (!pinPeriod || n.periodEnd === pinPeriod),
      );
      const sub = notes.filter(
        (n) => n.companyId === co.id && n.lane === "subjective" && (!pinPeriod || n.periodEnd === pinPeriod),
      );
      const flags = openFlags
        .filter((f) => f.companyId === co.id)
        .map((f) => ({
          flagKey: f.flagKey,
          severity: f.severity,
          label: FLAG_CATALOG.find((c) => c.key === f.flagKey)?.label ?? f.flagKey,
        }));
      return {
        companyId: co.id,
        name: co.name,
        stage: co.stage,
        metrics: curated,
        flags,
        objective: obj.map((n) => n.body),
        subjective: sub.map((n) => n.body),
        bookMetrics,
      };
    });
    const packRows = pages.map((p) =>
      buildMonthlyPackRow({
        companyId: p.companyId,
        name: p.name,
        stage: p.stage,
        periodEnd: pinPeriod,
        metrics: p.bookMetrics,
        objective: p.objective,
        subjective: p.subjective,
      }),
    );
    const bodyPages = pages.map(({ bookMetrics: _b, ...rest }) => rest);
    const [row] = await tx
      .insert(reports)
      .values({
        orgId,
        kind: "monthly_pack",
        title: `Monthly pack ${pinPeriod}`,
        body: { periodEnd: pinPeriod, pages: bodyPages, rows: packRows },
        createdBy: "system:monthly_pack_schedule",
        artifactStatus: "queued",
      })
      .returning();
    await recordOpsEvent(tx, orgId, "monthly_pack_drafted", {
      meta: { reportId: row?.id, periodEnd: pinPeriod, scheduled: true },
    });
    return row;
  });
}

/** Orgs that opted into scheduled monthly packs for today's UTC day. */
export async function listMonthlyPackDueOrgs(asOf = new Date()) {
  const day = asOf.getUTCDate();
  const db = getDb();
  const orgs = await db.select({ id: organization.id }).from(organization);
  const due: string[] = [];
  for (const o of orgs) {
    const [settings] = await withOrg(o.id, (tx) => tx.select().from(orgSettings));
    if (settings?.monthlyPackEnabled && settings.monthlyPackDay === day) due.push(o.id);
  }
  return due;
}
