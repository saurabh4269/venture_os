import { detectAll, latestByPeriod, parseFlagPolicyJson, seriesFor } from "@venture-os/core";
import { and, desc, eq, inArray } from "drizzle-orm";
import { withOrg } from "./client.js";
import { companies, flagEvents, marks, metricValues, orgSettings, positions } from "./schema.js";

export async function runFlagJob(orgId: string, companyId?: string) {
  return withOrg(orgId, async (tx) => {
    const [settings] = await tx.select().from(orgSettings);
    const policy = parseFlagPolicyJson(settings?.flagPolicy);
    const cos = companyId
      ? await tx.select().from(companies).where(eq(companies.id, companyId))
      : await tx.select().from(companies);
    let n = 0;
    for (const co of cos) {
      const metrics = await tx
        .select()
        .from(metricValues)
        .where(eq(metricValues.companyId, co.id))
        .orderBy(desc(metricValues.periodEnd), desc(metricValues.version));

      const cashS = seriesFor(metrics, "cash");
      const burnS = seriesFor(metrics, "burn");
      const gmS = seriesFor(metrics, "gross_margin_pct");
      const revS = seriesFor(metrics, "net_revenue");
      const planS = seriesFor(metrics, "plan_revenue");
      const hcS = seriesFor(metrics, "headcount");

      const lastMis = latestByPeriod(metrics.filter((m) => m.lane === "objective"))[0];
      const pos = await tx.select().from(positions).where(eq(positions.companyId, co.id));
      let lastMark: string | null = null;
      for (const p of pos) {
        const mk = await tx.select().from(marks).where(eq(marks.positionId, p.id)).orderBy(desc(marks.asOf));
        const asOf = mk[0]?.asOf ?? null;
        if (asOf && (!lastMark || asOf > lastMark)) lastMark = asOf;
      }

      const burnAvg =
        burnS.slice(0, 3).filter((b) => b.valueNumeric != null).length === 0
          ? null
          : burnS
              .slice(0, 3)
              .map((b) => b.valueNumeric)
              .filter((v): v is number => v != null)
              .reduce((a, b) => a + b, 0) /
            burnS.slice(0, 3).filter((b) => b.valueNumeric != null).length;

      const hits = detectAll({
        cash: cashS[0]?.valueNumeric ?? null,
        burn: burnS[0]?.valueNumeric ?? null,
        runwayBurn: burnAvg,
        priorBurn: burnS[1]?.valueNumeric ?? null,
        gm: gmS[0]?.valueNumeric ?? null,
        priorGm: gmS[1]?.valueNumeric ?? null,
        revenue: revS[0]?.valueNumeric ?? null,
        priorRevenue: revS[1]?.valueNumeric ?? null,
        planRevenue: planS[0]?.valueNumeric ?? null,
        headcount: hcS[0]?.valueNumeric ?? null,
        priorHeadcount: hcS[1]?.valueNumeric ?? null,
        lastMisPeriodEnd: lastMis?.periodEnd ?? null,
        lastMarkAsOf: lastMark,
        priorCash: cashS[1]?.valueNumeric ?? null,
        companyCreatedAt: co.createdAt,
        policy,
      });

      const held = await tx
        .select()
        .from(flagEvents)
        .where(
          and(
            eq(flagEvents.companyId, co.id),
            inArray(flagEvents.status, ["snoozed", "muted"]),
          ),
        );
      const now = Date.now();
      const skip = new Set(
        held
          .filter((h) => {
            if (h.status === "muted") return true;
            if (h.status === "snoozed") {
              const until = h.snoozedUntil;
              return until ? until.getTime() > now : true;
            }
            return false;
          })
          .map((h) => h.flagKey),
      );

      await tx
        .update(flagEvents)
        .set({ status: "cleared" })
        .where(and(eq(flagEvents.companyId, co.id), eq(flagEvents.status, "open")));

      for (const hit of hits) {
        if (skip.has(hit.flagKey)) continue;
        const metricKeys: Record<string, string[]> = {
          runway_short: ["cash", "burn"],
          burn_up: ["burn"],
          spend_without_revenue: ["burn", "net_revenue"],
          gm_compression: ["gross_margin_pct"],
          plan_variance: ["net_revenue", "plan_revenue"],
          revenue_down: ["net_revenue"],
          headcount_drop: ["headcount"],
          cash_unreported: ["cash"],
        };
        const byKey: Record<string, typeof cashS> = {
          cash: cashS,
          burn: burnS,
          net_revenue: revS,
          plan_revenue: planS,
          gross_margin_pct: gmS,
          headcount: hcS,
        };
        const refs = (metricKeys[hit.flagKey] ?? [])
          .flatMap((k) => byKey[k]?.slice(0, 1) ?? [])
          .map((m) => m.sourceRefId)
          .filter(Boolean);
        await tx.insert(flagEvents).values({
          orgId,
          companyId: co.id,
          flagKey: hit.flagKey,
          severity: hit.severity,
          evidence: hit.evidence,
          sourceRefIds: refs,
          status: "open",
        });
        n += 1;
      }
    }
    return { raised: n };
  });
}
