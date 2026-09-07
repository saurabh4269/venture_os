import { MetricKeySchema, type Unit, type Currency } from "@venture-os/schema";
import { METRIC_CATALOG, matchMetricAlias } from "./catalog.js";
import type { ExtractedProposal } from "./extract.js";
import { assertCommentaryLane, type CommentaryLane, type CommentarySourceKind } from "./commentary.js";
import { excerptAppearsInSource, numberAppearsInSource } from "./pdf-layout.js";
import { parsePeriodHint } from "./fiscal.js";
import { salvageJsonRoot, salvageListItems } from "./salvage.js";

/**
 * Pure propose helpers. LLM never writes the book — callers put results in inbox only.
 * Cite-or-refuse: numbers and excerpts must resolve against the source text.
 */

const ALLOWED_KEYS = METRIC_CATALOG.map((m) => m.key);

type RawProposal = {
  label?: unknown;
  metricKey?: unknown;
  valueNumeric?: unknown;
  unit?: unknown;
  currency?: unknown;
  periodHint?: unknown;
  excerpt?: unknown;
  page?: unknown;
};

function isRawProposal(item: unknown): item is RawProposal {
  return Boolean(item && typeof item === "object" && !Array.isArray(item));
}

export function buildExtractAssistPrompt(args: {
  sourceText: string;
  heuristicLabels: string[];
}): { system: string; user: string } {
  return {
    system: [
      "You propose MIS metric mappings for a VC portfolio book (propose-only; humans confirm).",
      "Return ONLY JSON:",
      '{"proposals":[{"label":"...","metricKey":"...","valueNumeric":number|null,"unit":"crore|lakh|thousand|million|percent|months|count|unit|unknown","currency":"INR|USD|EUR|GBP|unknown","periodHint":"FY26 M5 or 2026-01 or Q3 FY26","excerpt":"verbatim substring from source including the number","page":1}]}',
      `Allowed metricKey values ONLY: ${ALLOWED_KEYS.join(", ")}.`,
      "Cite-or-refuse rules (absolute):",
      "- Never invent numbers. valueNumeric must appear in the source (same digits).",
      "- excerpt MUST be a verbatim contiguous substring of the source that contains the label and number.",
      "- Prefer null over guessing. If unit is unclear use unit=unknown.",
      "- Do not conflate cash with funding/raise proceeds — cash means closing cash balance only.",
      "- Do not restate heuristic labels already listed.",
      "- Max 12 proposals. No markdown fences.",
    ].join(" "),
    user: [
      `Already mapped labels (skip): ${args.heuristicLabels.slice(0, 40).join(" | ") || "(none)"}`,
      "Source excerpt:",
      args.sourceText.slice(0, 12_000),
    ].join("\n"),
  };
}

export function parseExtractAssistJson(
  raw: string,
  opts?: { sheet?: string; confidence?: number; sourceText?: string; fyStartMonth?: number },
): ExtractedProposal[] {
  const root = salvageJsonRoot(raw);
  if (!root) return [];
  const list = salvageListItems(root, isRawProposal, 12);
  const out: ExtractedProposal[] = [];
  const sheet = opts?.sheet ?? "llm";
  const confidence = Math.min(opts?.confidence ?? 0.45, 0.55);
  const sourceText = opts?.sourceText ?? "";
  const fy = opts?.fyStartMonth ?? 4;

  for (const r of list) {
    const label = String(r.label ?? "").trim();
    if (!label) continue;
    const keyRaw = String(r.metricKey ?? "");
    const keyParse = MetricKeySchema.safeParse(keyRaw);
    const def = keyParse.success ? METRIC_CATALOG.find((m) => m.key === keyParse.data) : matchMetricAlias(label);
    if (!def) continue;
    const valueNumeric =
      typeof r.valueNumeric === "number" && Number.isFinite(r.valueNumeric) ? r.valueNumeric : null;
    const unit = normalizeUnit(r.unit, def.defaultUnit);
    const currency = normalizeCurrency(r.currency);
    const excerpt = String(r.excerpt ?? "").trim().slice(0, 400) || `${label} → ${valueNumeric ?? ""}`;
    const page =
      typeof r.page === "number" && Number.isFinite(r.page) ? Math.max(1, Math.floor(r.page)) : undefined;

    if (sourceText) {
      if (valueNumeric != null && !numberAppearsInSource(valueNumeric, sourceText)) continue;
      if (!excerptAppearsInSource(excerpt, sourceText) && !excerptAppearsInSource(label, sourceText)) continue;
    }

    const periodHint = String(r.periodHint ?? "");
    const period = periodHint
      ? parsePeriodHint(periodHint, fy)
      : parsePeriodHint(`${label} ${excerpt}`, fy);

    const kind = unit === "unknown" && def.unitFamily === "money" ? "unit_ambiguity" : "metric";
    out.push({
      kind,
      metricKey: def.key,
      label,
      valueNumeric,
      unit,
      currency: def.unitFamily === "money" ? currency : "unknown",
      periodStart: period?.start,
      periodEnd: period?.end,
      grain: period?.grain ?? "month",
      confidence: kind === "unit_ambiguity" ? Math.min(confidence, 0.35) : confidence,
      locator: { sheet, page, excerpt },
      excerpt,
      lane: "objective",
    });
  }
  return out;
}

/** Drop proposals that invent digits not present in source. */
export function filterProposalsAgainstSource(
  proposals: ExtractedProposal[],
  sourceText: string,
): ExtractedProposal[] {
  if (!sourceText.trim()) return [];
  return proposals.filter((p) => {
    if (p.valueNumeric != null && !numberAppearsInSource(p.valueNumeric, sourceText)) return false;
    if (p.excerpt && excerptAppearsInSource(p.excerpt, sourceText)) return true;
    return excerptAppearsInSource(p.label, sourceText);
  });
}

/** Merge LLM proposals that do not duplicate heuristic metricKey+label pairs. */
export function mergeExtractProposals(
  heuristic: ExtractedProposal[],
  assisted: ExtractedProposal[],
): ExtractedProposal[] {
  const seen = new Set(
    heuristic.map((p) => `${p.metricKey ?? ""}::${p.label.toLowerCase()}::${p.periodEnd ?? ""}`),
  );
  const extra: ExtractedProposal[] = [];
  for (const p of assisted) {
    const k = `${p.metricKey ?? ""}::${p.label.toLowerCase()}::${p.periodEnd ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    extra.push(p);
  }
  return [...heuristic, ...extra];
}

export function buildObjectiveCommentaryPrompt(args: {
  companyName: string;
  facts: { metricKey: string; label: string; value: number | null; periodEnd: string; unit: string }[];
}): { system: string; user: string } {
  return {
    system: [
      "Draft OBJECTIVE portfolio commentary from confirmed MIS facts only.",
      "Return ONLY JSON: {\"body\":\"...\"}. No invented numbers. Missing stays unmentioned,",
      "never as zero. Cite period ends in prose. Max 120 words. No markdown.",
    ].join(" "),
    user: [
      `Company: ${args.companyName}`,
      "Confirmed facts (null = not reported):",
      ...args.facts.map(
        (f) =>
          `- ${f.label} (${f.metricKey}) @ ${f.periodEnd}: ${f.value == null ? "not reported" : `${f.value} ${f.unit}`}`,
      ),
    ].join("\n"),
  };
}

export function buildSubjectiveCommentaryPrompt(args: {
  companyName: string;
  transcriptExcerpt: string;
}): { system: string; user: string } {
  return {
    system: [
      "Draft SUBJECTIVE call commentary from the transcript excerpt only.",
      "Return ONLY JSON: {\"body\":\"...\"}. Do not invent financial figures.",
      "Quote concerns in the partner's voice, max 120 words. No markdown.",
    ].join(" "),
    user: [`Company: ${args.companyName}`, "Transcript excerpt:", args.transcriptExcerpt.slice(0, 8_000)].join(
      "\n",
    ),
  };
}

export function parseCommentaryDraftJson(
  raw: string,
  lane: CommentaryLane,
  sourceKind: CommentarySourceKind,
): { ok: true; body: string } | { ok: false; code: string } {
  const gate = assertCommentaryLane(lane, sourceKind);
  if (!gate.ok) return gate;
  const parsed = salvageJsonRoot(raw);
  const body =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) && typeof (parsed as { body?: unknown }).body === "string"
      ? String((parsed as { body: string }).body).trim()
      : "";
  if (!body || body.length < 8) return { ok: false, code: "empty_draft" };
  return { ok: true, body: body.slice(0, 4_000) };
}

function normalizeUnit(raw: unknown, fallback: Unit): Unit {
  const s = String(raw ?? "").toLowerCase();
  const allowed: Unit[] = ["lakh", "crore", "thousand", "million", "unit", "percent", "months", "count", "unknown"];
  if (allowed.includes(s as Unit)) return s as Unit;
  if (s === "%" || s === "pct") return "percent";
  if (s === "cr") return "crore";
  return fallback === "unknown" ? "unknown" : fallback;
}

function normalizeCurrency(raw: unknown): Currency {
  const s = String(raw ?? "").toUpperCase();
  if (s === "INR" || s === "USD" || s === "EUR" || s === "GBP") return s;
  return "unknown";
}

export { numberAppearsInSource, excerptAppearsInSource } from "./pdf-layout.js";
