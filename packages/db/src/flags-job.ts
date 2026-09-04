import { detectAll } from "@venture-os/core";
import { and, desc, eq } from "drizzle-orm";
import { withOrg } from "./client.js";
import { companies, flagEvents, marks, metricValues, positions } from "./schema.js";

function latest(
  rows: { metricKey: string; periodEnd: string; valueNumeric: number | null; sourceRefId: string }[],
  key: string,
) {
  const hit = rows.find((r) => r.metricKey === key);
  return hit?.valueNumeric ?? null;
}

function prior(
  rows: { metricKey: string; periodEnd: string; valueNumeric: number | null }[],
  key: string,
) {
  const matches = rows.filter((r) => r.metricKey === key);
  return matches[1]?.valueNumeric ?? null;
}

export async function runFlagJob(orgId: string, companyId?: string) {
  return withOrg(orgId, async (tx) => {
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

      const lastMis = metrics.find((m) => m.lane === "objective");
      const pos = await tx.select().from(positions).where(eq(positions.companyId, co.id));
      let lastMark: string | null = null;
      if (pos[0]) {
        const mk = await tx
          .select()
          .from(marks)
          .where(eq(marks.positionId, pos[0].id))
          .orderBy(desc(marks.asOf));
        lastMark = mk[0]?.asOf ?? null;
      }

      const hits = detectAll({
        cash: latest(metrics, "cash"),
        burn: latest(metrics, "burn"),
        priorBurn: prior(metrics, "burn"),
        gm: latest(metrics, "gross_margin_pct"),
        priorGm: prior(metrics, "gross_margin_pct"),
        revenue: latest(metrics, "net_revenue"),
        planRevenue: latest(metrics, "plan_revenue"),
        lastMisPeriodEnd: lastMis?.periodEnd ?? null,
        lastMarkAsOf: lastMark,
        priorCash: prior(metrics, "cash"),
      });

      await tx
        .update(flagEvents)
        .set({ status: "cleared" })
        .where(and(eq(flagEvents.companyId, co.id), eq(flagEvents.status, "open")));

      for (const hit of hits) {
        const refs = metrics
          .filter((m) => m.metricKey === "cash" || m.metricKey === "burn" || m.metricKey === hit.flagKey)
          .slice(0, 3)
          .map((m) => m.sourceRefId);
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
