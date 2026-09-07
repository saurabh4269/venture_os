/**
 * §7-style success counters. Event keys are closed; never invent vendor field names.
 * Values are additive counts or timed durations in ms — never fabricated portfolio facts.
 */

export const OPS_EVENT_KEYS = [
  "parse_completed",
  "inbox_pending",
  "confirm_human",
  "confirm_auto",
  "auto_confirm_skipped",
  "ask_cited",
  "ask_refused",
  "connector_sync_ok",
  "connector_sync_fail",
  "monthly_pack_drafted",
  "onboard_company_ms",
  "commentary_draft_proposed",
  "extract_llm_assist",
] as const;

export type OpsEventKey = (typeof OPS_EVENT_KEYS)[number];

export function isOpsEventKey(raw: string): raw is OpsEventKey {
  return (OPS_EVENT_KEYS as readonly string[]).includes(raw);
}

/** High-confidence auto-confirm gate. Missing threshold → never auto. */
export function shouldAutoConfirm(args: {
  confidence: number;
  kind: string;
  unit: string;
  metricKey?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  companyId?: string | null;
  minConfidence: number | null | undefined;
}): boolean {
  if (args.minConfidence == null || !Number.isFinite(args.minConfidence)) return false;
  if (args.minConfidence < 0.5 || args.minConfidence > 1) return false;
  if (args.kind !== "metric") return false;
  if (!args.metricKey) return false;
  if (!args.companyId) return false;
  if (!args.periodStart || !args.periodEnd) return false;
  if (!args.unit || args.unit === "unknown") return false;
  return args.confidence >= args.minConfidence;
}

/** Actor id stored on auto-confirmed metric_values.confirmed_by (auditable sentinel). */
export const AUTO_CONFIRM_ACTOR = "system:auto_confirm";
