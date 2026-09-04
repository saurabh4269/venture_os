import { randomUUID } from "node:crypto";
import {
  applyCorrectionLedger,
  extractFromPdfText,
  extractFromRows,
  matchMetricAlias,
  type ExtractedProposal,
} from "@venture-os/core";
import { and, eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import { withOrg, type Database } from "./client.js";
import { companies, corrections, documentChunks, documents, inboxItems, parseJobs, sourceRefs } from "./schema.js";
import { createObjectStore } from "./objects.js";

export async function runParseJob(orgId: string, documentId: string): Promise<{ proposals: number }> {
  return withOrg(orgId, async (tx) => {
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) throw new Error("document not found");
    const [job] = await tx
      .insert(parseJobs)
      .values({ orgId, documentId, status: "running", startedAt: new Date() })
      .returning();

    try {
      const store = createObjectStore();
      const buf = await store.get(doc.storageKey);
      const [company] = doc.companyId
        ? await tx.select().from(companies).where(eq(companies.id, doc.companyId))
        : [];
      const fy = company?.fyStartMonth ?? 4;
      const proposals = await extractBuffer(buf, doc.mime, doc.filename, fy);

      const activeCorrections = doc.companyId
        ? await tx
            .select()
            .from(corrections)
            .where(and(eq(corrections.companyId, doc.companyId), eq(corrections.active, true)))
        : [];

      for (const p of proposals) {
        applyCorrectionLedger(p, activeCorrections);
        const refId = randomUUID();
        await tx.insert(sourceRefs).values({
          id: refId,
          orgId,
          documentId,
          locator: p.locator,
          excerpt: p.excerpt,
        });
        await tx.insert(inboxItems).values({
          orgId,
          companyId: doc.companyId,
          documentId,
          sourceRefId: refId,
          kind: p.kind,
          status: "pending",
          proposed: p,
          confidence: p.confidence,
          locator: p.locator,
          proposedBy: "system",
        });
      }

      const text = proposals.map((p) => p.excerpt).join("\n") || doc.filename;
      await tx.insert(documentChunks).values({
        orgId,
        documentId,
        body: text,
      });
      await tx.execute(
        // FTS vector — raw SQL on last inserted chunks for this document
        (await import("drizzle-orm")).sql`
          update document_chunks
          set tsv = to_tsvector('english', body)
          where document_id = ${documentId} and org_id = ${orgId}
        `,
      );

      await tx
        .update(parseJobs)
        .set({ status: "done", finishedAt: new Date() })
        .where(eq(parseJobs.id, job!.id));
      return { proposals: proposals.length };
    } catch (err) {
      await tx
        .update(parseJobs)
        .set({ status: "error", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
        .where(eq(parseJobs.id, job!.id));
      throw err;
    }
  });
}

async function extractBuffer(
  buf: Buffer,
  mime: string,
  filename: string,
  fy: number,
): Promise<ExtractedProposal[]> {
  const isXlsx =
    mime.includes("spreadsheet") ||
    filename.endsWith(".xlsx") ||
    filename.endsWith(".xls") ||
    filename.endsWith(".csv");
  if (isXlsx) {
    const wb = new ExcelJS.Workbook();
    // ExcelJS supports xlsx; csv via CSV read
    if (filename.endsWith(".csv")) {
      const text = buf.toString("utf8");
      const rows = text.split(/\r?\n/).map((l) => l.split(","));
      return extractFromRows(rows, "csv", fy);
    }
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const all: ExtractedProposal[] = [];
    wb.eachSheet((sheet) => {
      const rows: unknown[][] = [];
      sheet.eachRow((row) => {
        const cells: unknown[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          cells.push(cell.value ?? null);
        });
        rows.push(cells);
      });
      all.push(...extractFromRows(rows, sheet.name, fy));
    });
    return all;
  }
  const text = await pdfToText(buf);
  return extractFromPdfText(text, fy);
}

async function pdfToText(buf: Buffer): Promise<string> {
  try {
    const { createRequire } = await import("node:module");
    const req = createRequire(import.meta.url);
    const fn = req("pdf-parse") as (b: Buffer) => Promise<{ text: string }>;
    const res = await fn(buf);
    return res.text ?? "";
  } catch {
    return buf.toString("utf8").replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ");
  }
}

export { matchMetricAlias };
