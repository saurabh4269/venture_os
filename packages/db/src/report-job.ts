import { createObjectStore } from "./objects.js";
import { withOrg } from "./client.js";
import { eq } from "drizzle-orm";
import { reports } from "./schema.js";
import ExcelJS from "exceljs";

type ReportMetric = {
  key: string;
  label?: string;
  value: number | null;
  unit: string;
  currency?: string;
  periodEnd: string;
  sourceRefId: string;
};

type MonthlyRow = {
  name: string;
  stage?: string | null;
  periodEnd?: string;
  metrics: ReportMetric[];
  objective: string[];
  subjective: string[];
};

type ReportPage = {
  name: string;
  metrics: ReportMetric[];
  objective: string[];
  subjective: string[];
};

/**
 * Worker-rendered artifact. Writes XLSX to the object store.
 * Missing stays —. Objective and subjective never share a cell.
 */
export async function runReportJob(orgId: string, reportId: string) {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx.select().from(reports).where(eq(reports.id, reportId));
    if (!row) return { ok: false, error: "not_found" };
    await tx.update(reports).set({ artifactStatus: "queued", artifactError: null }).where(eq(reports.id, reportId));
    try {
      const body = row.body as { pages?: ReportPage[]; rows?: MonthlyRow[]; periodEnd?: string };
      const buf = await buildArtifactXlsx(row.title, row.kind, body);
      const key = `reports/${orgId}/${reportId}.xlsx`;
      await createObjectStore().put(
        key,
        buf,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      await tx
        .update(reports)
        .set({ storageKey: key, artifactStatus: "ready", artifactError: null })
        .where(eq(reports.id, reportId));
      return { ok: true, storageKey: key };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "artifact_failed";
      await tx.update(reports).set({ artifactStatus: "failed", artifactError: msg }).where(eq(reports.id, reportId));
      return { ok: false, error: msg };
    }
  });
}

async function buildArtifactXlsx(
  title: string,
  kind: string,
  body: { pages?: ReportPage[]; rows?: MonthlyRow[]; periodEnd?: string },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Venture OS";
  const monthly = wb.addWorksheet("Monthly");
  monthly.addRow(["Venture OS monthly pack — confirmed book facts only. Missing = —. Lanes not blended."]);
  monthly.addRow([title, kind, body.periodEnd ?? ""]);
  monthly.addRow([]);
  monthly.addRow([
    "Company",
    "Stage",
    "Period end",
    "Net revenue",
    "Gross margin",
    "Cash",
    "Burn",
    "Runway",
    "Objective",
    "Subjective",
  ]);
  const rows = body.rows?.length
    ? body.rows
    : (body.pages ?? []).map((p) => ({
        name: p.name,
        stage: null,
        periodEnd: p.metrics.find((m) => m.periodEnd)?.periodEnd ?? "",
        metrics: p.metrics,
        objective: p.objective,
        subjective: p.subjective,
      }));
  for (const r of rows) {
    const byKey = Object.fromEntries(r.metrics.map((m) => [m.key, m]));
    monthly.addRow([
      r.name,
      r.stage ?? "—",
      r.periodEnd || "—",
      cell(byKey.net_revenue),
      cell(byKey.gross_margin_pct),
      cell(byKey.cash),
      cell(byKey.burn),
      cell(byKey.runway_months),
      r.objective.join(" / ") || "—",
      r.subjective.join(" / ") || "—",
    ]);
  }
  const notes = wb.addWorksheet("Lanes");
  notes.addRow(["Company", "Lane", "Body"]);
  for (const r of rows) {
    for (const line of r.objective) notes.addRow([r.name, "objective", line]);
    for (const line of r.subjective) notes.addRow([r.name, "subjective", line]);
    if (!r.objective.length) notes.addRow([r.name, "objective", "—"]);
    if (!r.subjective.length) notes.addRow([r.name, "subjective", "—"]);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function cell(m?: ReportMetric) {
  if (!m || m.value == null) return "—";
  return m.value;
}
