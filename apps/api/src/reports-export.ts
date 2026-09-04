import ExcelJS from "exceljs";

type ReportMetric = {
  key: string;
  label?: string;
  value: number | null;
  unit: string;
  currency?: string;
  periodEnd: string;
  sourceRefId: string;
  valueEur?: number | null;
  fxRate?: number | null;
  fxDate?: string | null;
  fxSource?: string | null;
};

type ReportPage = {
  name: string;
  stage?: string | null;
  metrics: ReportMetric[];
  objective: string[];
  subjective: string[];
  flags?: { flagKey: string; severity: string; label?: string }[];
};

type MonthlyRow = {
  name: string;
  stage?: string | null;
  periodEnd?: string;
  metrics: ReportMetric[];
  objective: string[];
  subjective: string[];
};

type ReportRow = {
  title: string;
  kind: string;
  body: unknown;
  createdAt: Date | string;
};

export async function buildExports(report: ReportRow, fmt: "pdf" | "pptx" | "xlsx") {
  const payload = report.body as { pages?: ReportPage[]; rows?: MonthlyRow[]; periodEnd?: string };
  const pages = (payload.pages ?? []) as ReportPage[];
  if (fmt === "xlsx") {
    const wb = new ExcelJS.Workbook();
    if (report.kind === "monthly_pack" || payload.rows?.length) {
      const monthly = wb.addWorksheet("Monthly");
      monthly.addRow(["Venture OS monthly pack — confirmed book facts. Missing = —. Lanes not blended."]);
      monthly.addRow([report.title, String(report.createdAt), payload.periodEnd ?? ""]);
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
      const rows =
        payload.rows ??
        pages.map((p) => ({
          name: p.name,
          stage: p.stage,
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
          byKey.net_revenue?.value ?? "—",
          byKey.gross_margin_pct?.value ?? "—",
          byKey.cash?.value ?? "—",
          byKey.burn?.value ?? "—",
          byKey.runway_months?.value ?? "—",
          r.objective.join(" / ") || "—",
          r.subjective.join(" / ") || "—",
        ]);
      }
    }
    const sheet = wb.addWorksheet("Book");
    sheet.addRow(["Venture OS report — confirmed book facts only"]);
    sheet.addRow([report.title, String(report.createdAt)]);
    sheet.addRow([]);
    sheet.addRow([
      "Company",
      "Metric",
      "Value",
      "Unit",
      "Currency",
      "EUR",
      "FX rate",
      "FX date",
      "FX source",
      "Period end",
      "source_ref",
    ]);
    for (const p of pages) {
      for (const m of p.metrics) {
        const triple = Boolean(m.fxRate && m.fxDate && m.fxSource);
        sheet.addRow([
          p.name,
          m.label ?? m.key,
          m.value ?? "—",
          m.unit,
          m.currency ?? "",
          triple ? (m.valueEur ?? "—") : "—",
          triple ? m.fxRate : "—",
          triple ? m.fxDate : "—",
          triple ? m.fxSource : "—",
          m.periodEnd || "—",
          m.sourceRefId || "—",
        ]);
      }
    }
    const notes = wb.addWorksheet("Commentary");
    notes.addRow(["Company", "Lane", "Body"]);
    for (const p of pages) {
      for (const line of p.objective) notes.addRow([p.name, "objective", line]);
      for (const line of p.subjective) notes.addRow([p.name, "subjective", line]);
      if (!p.objective.length) notes.addRow([p.name, "objective", "—"]);
      if (!p.subjective.length) notes.addRow([p.name, "subjective", "—"]);
    }
    const flags = wb.addWorksheet("Flags");
    flags.addRow(["Company", "Flag", "Severity"]);
    for (const p of pages) {
      if (!p.flags?.length) {
        flags.addRow([p.name, "—", "—"]);
        continue;
      }
      for (const f of p.flags) flags.addRow([p.name, f.label ?? f.flagKey, f.severity]);
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
      const chunks: ReportMetric[][] = [];
      for (let i = 0; i < p.metrics.length; i += 12) chunks.push(p.metrics.slice(i, i + 12));
      if (!chunks.length) chunks.push([]);
      chunks.forEach((chunk, idx) => {
        const s = pptx.addSlide();
        s.addText(idx === 0 ? p.name : `${p.name} (metrics ${idx + 1})`, {
          x: 0.5,
          y: 0.3,
          w: 9,
          fontSize: 18,
          fontFace: "Georgia",
        });
        const rows = chunk.map((m) => [
          { text: m.label ?? m.key },
          { text: m.value === null || m.value === undefined ? "—" : String(m.value) },
          { text: m.unit },
          { text: m.periodEnd || "—" },
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
        } else {
          s.addText("No confirmed metrics.", { x: 0.5, y: 1.2, w: 9, fontSize: 12 });
        }
      });
      const note = pptx.addSlide();
      note.addText(`${p.name} — commentary`, { x: 0.5, y: 0.3, w: 9, fontSize: 16, fontFace: "Georgia" });
      note.addText(`Objective:\n${p.objective.join("\n") || "—"}`, {
        x: 0.5,
        y: 0.9,
        w: 9,
        h: 2.4,
        fontSize: 12,
      });
      note.addText(`Subjective:\n${p.subjective.join("\n") || "—"}`, {
        x: 0.5,
        y: 3.5,
        w: 9,
        h: 2.2,
        fontSize: 12,
        color: "3D3A5C",
      });
      if (p.flags?.length) {
        note.addText(
          `Open flags: ${p.flags.map((f) => `${f.label ?? f.flagKey} (${f.severity})`).join("; ")}`,
          { x: 0.5, y: 5.8, w: 9, fontSize: 11 },
        );
      }
    }
    const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    return {
      body: buf,
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      filename: `${slug(report.title)}.pptx`,
    };
  }
  const lines = [
    report.title,
    `Generated ${String(report.createdAt)} from confirmed book facts.`,
    "Missing values are shown as em-dash. Objective and subjective lanes are not blended.",
    "",
  ];
  for (const p of pages) {
    lines.push(p.name);
    for (const m of p.metrics) {
      const triple = Boolean(m.fxRate && m.fxDate && m.fxSource);
      const fx = triple ? ` EUR ${m.valueEur ?? "—"} @ ${m.fxRate} on ${m.fxDate} (${m.fxSource})` : " EUR —";
      lines.push(
        `  ${m.label ?? m.key}: ${m.value ?? "—"} ${m.unit} ${m.currency ?? ""}  (${m.periodEnd || "—"})  src:${m.sourceRefId || "—"}${fx}`,
      );
    }
    if (p.flags?.length) {
      lines.push(`  Flags: ${p.flags.map((f) => `${f.label ?? f.flagKey} ${f.severity}`).join("; ")}`);
    }
    lines.push(`  Objective: ${p.objective.join(" / ") || "—"}`);
    lines.push(`  Subjective: ${p.subjective.join(" / ") || "—"}`);
    lines.push("");
  }
  const body = simplePdf(lines.join("\n"));
  return { body, contentType: "application/pdf", filename: `${slug(report.title)}.pdf` };
}

function slug(s: string) {
  const ascii = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const tail = [...s].reduce((n, ch) => n + ch.charCodeAt(0), 0).toString(36);
  return `${ascii || "report"}-${tail}`;
}

/** Multi-page text PDF. Does not silently drop lines after 60. */
export function simplePdf(text: string): Buffer {
  const escaped = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const all = escaped.split("\n");
  const PER = 58;
  const pages: string[][] = [];
  for (let i = 0; i < all.length; i += PER) pages.push(all.slice(i, i + PER));
  if (!pages.length) pages.push([""]);

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  const pageNums = pages.map((_, i) => 4 + i * 2);
  const contentNums = pages.map((_, i) => 5 + i * 2);
  objects.push(
    `2 0 obj << /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >> endobj`,
  );
  objects.push("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> endobj");
  pages.forEach((pl, i) => {
    objects.push(
      `${pageNums[i]} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentNums[i]} 0 R /Resources << /Font << /F1 3 0 R >> >> >> endobj`,
    );
    const cmds = [`BT /F1 10 Tf 40 780 Td 12 TL`];
    pl.forEach((line, j) => {
      if (j === 0) cmds.push(`(${line}) Tj`);
      else cmds.push(`T* (${line}) Tj`);
    });
    cmds.push("ET");
    const stream = cmds.join("\n");
    objects.push(
      `${contentNums[i]} 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
    );
  });

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