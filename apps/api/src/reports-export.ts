import ExcelJS from "exceljs";

type ReportRow = {
  title: string;
  kind: string;
  body: unknown;
  createdAt: Date | string;
};

export async function buildExports(report: ReportRow, fmt: "pdf" | "pptx" | "xlsx") {
  const pages = (report.body as { pages?: { name: string; metrics: { key: string; value: number | null; unit: string; periodEnd: string; sourceRefId: string }[]; objective: string[]; subjective: string[] }[] })
    .pages ?? [];
  if (fmt === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Book");
    sheet.addRow(["Venture OS report — confirmed book facts only"]);
    sheet.addRow([report.title, String(report.createdAt)]);
    sheet.addRow([]);
    sheet.addRow(["Company", "Metric", "Value", "Unit", "Period end", "source_ref"]);
    for (const p of pages) {
      for (const m of p.metrics) {
        sheet.addRow([p.name, m.key, m.value ?? "—", m.unit, m.periodEnd, m.sourceRefId]);
      }
    }
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    return {
      body: buf,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${slug(report.title)}.xlsx`,
    };
  }
  if (fmt === "pptx") {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();
    pptx.author = "Venture OS";
    pptx.title = report.title;
    const cover = pptx.addSlide();
    cover.addText(report.title, { x: 0.5, y: 1.5, w: 9, fontSize: 24, fontFace: "Georgia" });
    cover.addText("Draft from the book. Missing shown as —. Not blended commentary.", {
      x: 0.5,
      y: 2.3,
      w: 9,
      fontSize: 12,
    });
    for (const p of pages) {
      const s = pptx.addSlide();
      s.addText(p.name, { x: 0.5, y: 0.3, w: 9, fontSize: 18, fontFace: "Georgia" });
      const rows = p.metrics.slice(0, 10).map((m) => [
        { text: m.key },
        { text: m.value === null || m.value === undefined ? "—" : String(m.value) },
        { text: m.unit },
        { text: m.periodEnd },
      ]);
      if (rows.length) {
        s.addTable([[{ text: "Metric" }, { text: "Value" }, { text: "Unit" }, { text: "Period" }], ...rows], {
          x: 0.5,
          y: 0.9,
          w: 9,
          colW: [2.5, 2, 2, 2.5],
          border: { pt: 0.5, color: "D4CFC3" },
          fontSize: 11,
        });
      }
      s.addText(`Objective: ${p.objective[0] ?? "—"}`, { x: 0.5, y: 4.6, w: 9, fontSize: 10 });
      s.addText(`Subjective: ${p.subjective[0] ?? "—"}`, { x: 0.5, y: 5.1, w: 9, fontSize: 10, color: "3D3A5C" });
    }
    const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    return {
      body: buf,
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      filename: `${slug(report.title)}.pptx`,
    };
  }
  // Minimal PDF (text stream) — real file that opens.
  const lines = [
    report.title,
    `Generated ${String(report.createdAt)} from confirmed book facts.`,
    "Missing values are shown as em-dash. Objective and subjective lanes are not blended.",
    "",
  ];
  for (const p of pages) {
    lines.push(p.name);
    for (const m of p.metrics) {
      lines.push(`  ${m.key}: ${m.value ?? "—"} ${m.unit}  (${m.periodEnd})  src:${m.sourceRefId}`);
    }
    lines.push(`  Objective: ${p.objective.join(" / ") || "—"}`);
    lines.push(`  Subjective: ${p.subjective.join(" / ") || "—"}`);
    lines.push("");
  }
  const body = simplePdf(lines.join("\n"));
  return { body, contentType: "application/pdf", filename: `${slug(report.title)}.pdf` };
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
}

function simplePdf(text: string): Buffer {
  const escaped = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const wrapped = escaped.split("\n").slice(0, 60);
  const cmds = [`BT /F1 10 Tf 40 780 Td`];
  wrapped.forEach((line, i) => {
    if (i === 0) cmds.push(`(${line}) Tj`);
    else cmds.push(`T* (${line}) Tj`);
  });
  cmds.push("ET");
  const stream = cmds.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> endobj",
  ];
  let offset = 9;
  const xref = ["0000000000 65535 f "];
  let body = "%PDF-1.4\n";
  for (const obj of objects) {
    xref.push(String(offset).padStart(10, "0") + " 00000 n ");
    body += obj + "\n";
    offset = Buffer.byteLength(body);
  }
  const startxref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n${xref.join("\n")}\n`;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return Buffer.from(body);
}
