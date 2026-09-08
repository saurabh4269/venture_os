/** Report pack templates — every kind exports PDF, PPTX, and XLSX. */

export type ReportKind = "one_pager" | "portfolio" | "monthly_pack";
export type ReportExportFmt = "pdf" | "pptx" | "xlsx";

export const REPORT_EXPORT_FORMATS: {
  fmt: ReportExportFmt;
  label: string;
  hint: string;
}[] = [
  { fmt: "pdf", label: "PDF", hint: "Printable brief" },
  { fmt: "pptx", label: "PPTX", hint: "Slide deck" },
  { fmt: "xlsx", label: "XLSX", hint: "Workbook" },
];

export const REPORT_TEMPLATES: {
  kind: ReportKind;
  title: string;
  eyebrow: string;
  body: string;
  needsCompany: boolean;
  sections: string[];
  formats: ReportExportFmt[];
}[] = [
  {
    kind: "one_pager",
    title: "Company one-pager",
    eyebrow: "Tear sheet",
    body: "Single-company brief from booked metrics and evidence. Pick the name first — we will not invent one.",
    needsCompany: true,
    sections: ["Profile", "Ownership", "Booked KPIs", "Flags", "Commentary"],
    formats: ["pdf", "pptx", "xlsx"],
  },
  {
    kind: "portfolio",
    title: "Portfolio pack",
    eyebrow: "Fund snapshot",
    body: "Fund-wide snapshot across confirmed coverage. Optional focus company for the cover.",
    needsCompany: false,
    sections: ["Coverage", "NAV & MOIC", "Open flags", "Company roll", "Commentary"],
    formats: ["pdf", "pptx", "xlsx"],
  },
  {
    kind: "monthly_pack",
    title: "Monthly pack",
    eyebrow: "Ritual close",
    body: "Period close pack for LPs and the investment team. Uses the book only — blank where unconfirmed.",
    needsCompany: false,
    sections: ["Period header", "Command pulse", "Material moves", "Confirm queue", "Appendix"],
    formats: ["pdf", "pptx", "xlsx"],
  },
];

export const REPORT_KIND_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_TEMPLATES.map((t) => [t.kind, t.title]),
);

export function reportTemplate(kind: string) {
  return REPORT_TEMPLATES.find((t) => t.kind === kind) ?? REPORT_TEMPLATES[0]!;
}
