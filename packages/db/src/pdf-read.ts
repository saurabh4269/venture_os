import {
  MAX_PDF_ASSIST_PAGES,
  type PdfPageBundle,
  type PdfTextItem,
} from "@venture-os/core";

/**
 * Load PDF pages with positioned text via pdfjs. Falls back to empty on failure
 * so callers can use pdf-parse plain text.
 */
export async function loadPdfPages(buf: Buffer, maxPages = MAX_PDF_ASSIST_PAGES): Promise<PdfPageBundle[]> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buf),
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const doc = await loadingTask.promise;
    const n = Math.min(doc.numPages, maxPages);
    const pages: PdfPageBundle[] = [];
    for (let pageNum = 1; pageNum <= n; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      let text = "";
      for (const raw of content.items) {
        if (!raw || typeof raw !== "object" || !("str" in raw)) continue;
        const it = raw as { str: string; transform?: number[]; width?: number };
        const str = String(it.str ?? "");
        if (!str.trim()) continue;
        const transform = it.transform ?? [1, 0, 0, 1, 0, 0];
        const x = Number(transform[4] ?? 0);
        const y = Number(transform[5] ?? 0);
        items.push({ str, x, y, page: pageNum, width: it.width });
        text += str;
        // pdfjs often omits newlines between items — space-separate
        text += /[\s]$/.test(str) ? "" : " ";
      }
      pages.push({ page: pageNum, items, text: text.replace(/\s+/g, " ").trim() });
    }
    return pages;
  } catch {
    return [];
  }
}

export async function pdfPagesToPlainText(buf: Buffer, maxPages = MAX_PDF_ASSIST_PAGES): Promise<string> {
  const pages = await loadPdfPages(buf, maxPages);
  if (!pages.length) return "";
  return pages.map((p) => `--- page ${p.page} ---\n${p.text}`).join("\n");
}
