/** Report pack templates. Every kind exports PDF, PPTX, and XLSX. */

export type ReportKind = "one_pager" | "portfolio" | "monthly_pack";
export type ReportExportFmt = "pdf" | "pptx" | "xlsx";

export const REPORT_EXPORT_FORMATS: {
  fmt: ReportExportFmt;
  label: string;
}[] = [
  { fmt: "pdf", label: "PDF" },
  { fmt: "pptx", label: "PPTX" },
  { fmt: "xlsx", label: "XLSX" },
];

export const REPORT_TEMPLATES: {
  kind: ReportKind;
  title: string;
  needsCompany: boolean;
  sections: string[];
}[] = [
  {
    kind: "one_pager",
    title: "Company one-pager",
    needsCompany: true,
    sections: ["Profile", "Ownership", "Booked KPIs", "Flags", "Commentary"],
  },
  {
    kind: "portfolio",
    title: "Portfolio pack",
    needsCompany: false,
    sections: ["Coverage", "NAV and MOIC", "Open flags", "Company roll", "Commentary"],
  },
  {
    kind: "monthly_pack",
    title: "Monthly pack",
    needsCompany: false,
    sections: ["Period header", "Command pulse", "Material moves", "Confirm queue", "Appendix"],
  },
];

export const REPORT_KIND_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_TEMPLATES.map((t) => [t.kind, t.title]),
);

export function reportTemplate(kind: string) {
  return REPORT_TEMPLATES.find((t) => t.kind === kind) ?? REPORT_TEMPLATES[0]!;
}
