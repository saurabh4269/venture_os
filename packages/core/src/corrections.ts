export type CorrectionPatch = {
  metricKey: string;
  periodStart: string;
  periodEnd: string;
  patchedValue: number | null;
  patchedUnit: string | null;
  patchedCurrency: string | null;
};

export type CorrectableProposal = {
  metricKey?: string;
  periodStart?: string;
  periodEnd?: string;
  valueNumeric: number | null;
  unit: string;
  currency: string;
  excerpt: string;
  confidence: number;
};

/** Human overrides win. Re-parse must reapply the ledger, never drop it. */
export function applyCorrectionLedger<T extends CorrectableProposal>(proposal: T, rows: CorrectionPatch[]): T {
  if (!proposal.metricKey || !proposal.periodStart || !proposal.periodEnd) return proposal;
  const hit = rows.find(
    (c) =>
      c.metricKey === proposal.metricKey &&
      c.periodStart === proposal.periodStart &&
      c.periodEnd === proposal.periodEnd,
  );
  if (!hit) return proposal;
  proposal.valueNumeric = hit.patchedValue;
  if (hit.patchedUnit) proposal.unit = hit.patchedUnit as T["unit"];
  if (hit.patchedCurrency) proposal.currency = hit.patchedCurrency as T["currency"];
  proposal.excerpt = `${proposal.excerpt} · correction ledger applied`;
  proposal.confidence = 0.99;
  return proposal;
}
