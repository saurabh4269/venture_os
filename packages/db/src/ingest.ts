import { randomUUID } from "node:crypto";
import {
  AUTO_CONFIRM_ACTOR,
  applyCorrectionLedger,
  buildExtractAssistPrompt,
  clipAssistSource,
  extractFromPdfPages,
  extractFromPdfText,
  extractFromPlainText,
  extractFromRows,
  filterProposalsAgainstSource,
  matchMetricAlias,
  mergeExtractProposals,
  parseExtractAssistJson,
  parseMetricBookJson,
  resolveMetricCatalog,
  shouldAbortExtractAssist,
  shouldAutoConfirm,
  toEur,
  toInrCrore,
  type ExtractedProposal,
} from "@venture-os/core";
import { and, desc, eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import { withOrg, type Database } from "./client.js";
import {
  companies,
  corrections,
  documentChunks,
  documents,
  inboxItems,
  metricValues,
  orgSettings,
  parseJobs,
  sourceRefs,
} from "./schema.js";
import { createObjectStore } from "./objects.js";
import { recordOpsEvent } from "./ops.js";
import { loadPdfPages, pdfPagesToPlainText } from "./pdf-read.js";

export async function runParseJob(orgId: string, documentId: string): Promise<{ proposals: number; autoConfirmed: number }> {
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
      const [settings] = await tx.select().from(orgSettings);
      const minConf = settings?.autoConfirmMinConfidence ?? null;
      const metricCatalog = resolveMetricCatalog(parseMetricBookJson(settings?.metricBook));

      let proposals = await extractBuffer(buf, doc.mime, doc.filename, fy, metricCatalog);
      const assisted = await maybeLlmAssist(proposals, buf, doc.mime, doc.filename, fy);
      if (assisted.length) {
        proposals = mergeExtractProposals(proposals, assisted);
        await recordOpsEvent(tx, orgId, "extract_llm_assist", {
          value: assisted.length,
          meta: { documentId },
        });
      }

      const activeCorrections = doc.companyId
        ? await tx
            .select()
            .from(corrections)
            .where(and(eq(corrections.companyId, doc.companyId), eq(corrections.active, true)))
        : [];

      let autoConfirmed = 0;
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

        const auto = shouldAutoConfirm({
          confidence: p.confidence,
          kind: p.kind,
          unit: p.unit,
          metricKey: p.metricKey,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          companyId: doc.companyId,
          minConfidence: minConf,
        });

        const [inbox] = await tx
          .insert(inboxItems)
          .values({
            orgId,
            companyId: doc.companyId,
            documentId,
            sourceRefId: refId,
            kind: p.kind,
            status: auto ? "confirmed" : "pending",
            proposed: p,
            confidence: p.confidence,
            locator: p.locator,
            proposedBy: "system",
            reviewedBy: auto ? AUTO_CONFIRM_ACTOR : null,
            reviewedAt: auto ? new Date() : null,
          })
          .returning();

        if (auto && inbox && p.metricKey && doc.companyId && p.periodStart && p.periodEnd) {
          await writeAutoMetric(tx, {
            orgId,
            companyId: doc.companyId,
            proposal: p,
            sourceRefId: refId,
            inboxItemId: inbox.id,
          });
          autoConfirmed += 1;
          await recordOpsEvent(tx, orgId, "confirm_auto", {
            meta: { documentId, metricKey: p.metricKey, inboxItemId: inbox.id },
          });
        } else if (!auto) {
          await recordOpsEvent(tx, orgId, "inbox_pending", {
            meta: { documentId, kind: p.kind },
          });
        }

        await tx.insert(documentChunks).values({
          orgId,
          documentId,
          sourceRefId: refId,
          body: p.excerpt,
        });
      }

      if (proposals.length === 0) {
        await tx.insert(documentChunks).values({
          orgId,
          documentId,
          body: doc.filename,
        });
      }
      await tx.execute(
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
      await recordOpsEvent(tx, orgId, "parse_completed", {
        value: proposals.length,
        meta: { documentId, autoConfirmed },
      });
      return { proposals: proposals.length, autoConfirmed };
    } catch (err) {
      await tx
        .update(parseJobs)
        .set({ status: "error", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
        .where(eq(parseJobs.id, job!.id));
      throw err;
    }
  });
}

async function writeAutoMetric(
  tx: Database,
  args: {
    orgId: string;
    companyId: string;
    proposal: ExtractedProposal;
    sourceRefId: string;
    inboxItemId: string;
  },
) {
  const p = args.proposal;
  const metricKey = p.metricKey!;
  const periodStart = p.periodStart!;
  const periodEnd = p.periodEnd!;
  const existing = await tx
    .select()
    .from(metricValues)
    .where(
      and(
        eq(metricValues.companyId, args.companyId),
        eq(metricValues.metricKey, metricKey),
        eq(metricValues.periodStart, periodStart),
        eq(metricValues.periodEnd, periodEnd),
      ),
    )
    .orderBy(desc(metricValues.version));
  const version = (existing[0]?.version ?? 0) + 1;
  await tx.insert(metricValues).values({
    orgId: args.orgId,
    companyId: args.companyId,
    metricKey,
    periodStart,
    periodEnd,
    grain: p.grain ?? "month",
    valueNumeric: p.valueNumeric,
    unit: p.unit,
    currency: p.currency,
    valueInrCrore: toInrCrore(p.valueNumeric, p.unit, p.currency),
    valueEur: toEur(p.valueNumeric, p.currency, null),
    sourceRefId: args.sourceRefId,
    restatementOfId: existing[0]?.id ?? null,
    version,
    lane: "objective",
    confirmedBy: AUTO_CONFIRM_ACTOR,
    inboxItemId: args.inboxItemId,
  });
}

async function maybeLlmAssist(
  heuristic: ExtractedProposal[],
  buf: Buffer,
  mime: string,
  filename: string,
  fy: number,
): Promise<ExtractedProposal[]> {
  if (!process.env.OPENAI_API_KEY) return [];
  try {
    const { createLlmProvider } = await import("@venture-os/llm");
    const llm = createLlmProvider();
    const text = clipAssistSource(await bufferToAssistText(buf, mime, filename, heuristic));
    const gate = shouldAbortExtractAssist(text);
    if (gate.abort) return [];
    const prompt = buildExtractAssistPrompt({
      sourceText: text,
      heuristicLabels: heuristic.map((p) => p.label),
    });
    const res = await llm.complete({
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0,
      maxTokens: 1200,
    });
    const parsed = parseExtractAssistJson(res.text, {
      sheet: "llm_assist",
      confidence: 0.45,
      sourceText: text,
      fyStartMonth: fy,
    });
    return filterProposalsAgainstSource(parsed, text);
  } catch {
    return [];
  }
}

async function bufferToAssistText(
  buf: Buffer,
  mime: string,
  filename: string,
  heuristic: ExtractedProposal[],
): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || mime.includes("csv") || mime.includes("text/plain")) {
    return buf.toString("utf8").slice(0, 12_000);
  }
  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) {
    return docxToText(buf);
  }
  if (mime.includes("pdf") || lower.endsWith(".pdf")) {
    const laid = await pdfPagesToPlainText(buf);
    if (laid.trim()) return laid;
    return pdfToTextFallback(buf);
  }
  // Sparse spreadsheet heuristics → sample first sheet as text for assist
  if (
    heuristic.length < 3 &&
    (mime.includes("spreadsheet") || lower.endsWith(".xlsx") || lower.endsWith(".xls"))
  ) {
    return sampleWorkbookText(buf);
  }
  return "";
}

async function sampleWorkbookText(buf: Buffer): Promise<string> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const lines: string[] = [];
    let sheets = 0;
    wb.eachSheet((sheet) => {
      if (sheets >= 2) return;
      sheets += 1;
      lines.push(`--- ${sheet.name} ---`);
      let r = 0;
      sheet.eachRow((row) => {
        if (r >= 40) return;
        r += 1;
        const cells: string[] = [];
        row.eachCell({ includeEmpty: false }, (cell) => {
          cells.push(String(cell.value ?? ""));
        });
        if (cells.length) lines.push(cells.join(" | "));
      });
    });
    return lines.join("\n").slice(0, 12_000);
  } catch {
    return "";
  }
}

async function extractBuffer(
  buf: Buffer,
  mime: string,
  filename: string,
  fy: number,
  catalog: ReturnType<typeof resolveMetricCatalog>,
): Promise<ExtractedProposal[]> {
  const lower = filename.toLowerCase();
  const isXlsx =
    mime.includes("spreadsheet") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv");
  if (isXlsx) {
    const wb = new ExcelJS.Workbook();
    if (lower.endsWith(".csv")) {
      const text = buf.toString("utf8");
      const rows = text.split(/\r?\n/).filter((l) => l.length).map(parseCsvLine);
      return extractFromRows(rows, "csv", fy, catalog);
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
      all.push(...extractFromRows(rows, sheet.name, fy, catalog));
    });
    return all;
  }
  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const text = await docxToText(buf);
    return extractFromPlainText(text, "docx", fy, 0.48);
  }
  // PDF: positioned layout first, then plain-text table/KV fallback
  const pages = await loadPdfPages(buf);
  if (pages.length) {
    const laid = extractFromPdfPages(pages, fy);
    if (laid.length) return laid;
    const joined = pages.map((p) => p.text).join("\n");
    if (joined.trim()) return extractFromPdfText(joined, fy);
  }
  const text = await pdfToTextFallback(buf);
  return extractFromPdfText(text, fy);
}

async function docxToText(buf: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value ?? "";
  } catch {
    return buf.toString("utf8").replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ");
  }
}

async function pdfToTextFallback(buf: Buffer): Promise<string> {
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

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export { matchMetricAlias };
