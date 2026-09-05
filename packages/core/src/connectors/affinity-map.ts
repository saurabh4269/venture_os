/**
 * Affinity v2 company mapper.
 *
 * Verified Company fields from Affinity API v2 (2026-07-15):
 * https://developer.affinity.co/api-reference/2026-07-15/companies/get-all-companies
 *   id (int64), name, domain, domains[], isGlobal, fields[]
 *
 * Field (when requested via fieldIds / fieldTypes):
 *   id, name, type, enrichmentSource, value
 *
 * Number FieldValue: { type: "number", data: number | null }
 *
 * There is no first-class ownership / position field on Company.
 * Ownership is only applied when the org configures `ownershipFieldId`
 * and that field's value is a documented number FieldValue.
 *
 * TODO(source-of-truth): confirm each firm's ownership field id via GET /v2/companies/fields.
 * Do not invent CRM field names.
 */

export type AffinityCompanyV2 = {
  id: number;
  name: string;
  domain: string | null;
  domains: string[];
  isGlobal?: boolean;
  fields?: AffinityFieldV2[];
};

export type AffinityFieldV2 = {
  id: string;
  name: string;
  type?: string;
  enrichmentSource?: string | null;
  value?: unknown;
};

export type MappedAffinityLink = {
  affinityCompanyId: string;
  name: string;
  domain: string | null;
  domains: string[];
  /** Null unless a configured number field is present. Missing ≠ 0. */
  ownershipPct: number | null;
  ownershipFieldId: string | null;
  ownershipFieldName: string | null;
};

export function isAffinityCompanyV2(raw: unknown): raw is AffinityCompanyV2 {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return typeof o.id === "number" && Number.isFinite(o.id) && typeof o.name === "string";
}

function numberFromFieldValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null) {
    const v = value as Record<string, unknown>;
    // Official FloatValue: { type: "number", data: number | null }
    if (v.type === "number") {
      return typeof v.data === "number" && Number.isFinite(v.data) ? v.data : null;
    }
    // Official FormulaValue is also a number-like union — only accept documented `data`.
    if (v.type === "formula-number" && typeof v.data === "number" && Number.isFinite(v.data)) {
      return v.data;
    }
  }
  return null;
}

export function mapAffinityCompany(
  raw: unknown,
  opts?: { ownershipFieldId?: string | null },
): MappedAffinityLink | null {
  if (!isAffinityCompanyV2(raw)) return null;
  const ownershipFieldId = opts?.ownershipFieldId?.trim() || null;
  let ownershipPct: number | null = null;
  let ownershipFieldName: string | null = null;
  if (ownershipFieldId && Array.isArray(raw.fields)) {
    const field = raw.fields.find((f) => f && f.id === ownershipFieldId);
    if (field) {
      ownershipPct = numberFromFieldValue(field.value);
      ownershipFieldName = field.name ?? null;
    }
  }
  const domain = raw.domain ?? (Array.isArray(raw.domains) ? (raw.domains[0] ?? null) : null);
  return {
    affinityCompanyId: String(raw.id),
    name: raw.name,
    domain,
    domains: Array.isArray(raw.domains) ? raw.domains.filter((d) => typeof d === "string") : [],
    ownershipPct,
    ownershipFieldId: ownershipPct != null ? ownershipFieldId : ownershipFieldId,
    ownershipFieldName,
  };
}

export function mapAffinityCompanyPage(
  payload: unknown,
  opts?: { ownershipFieldId?: string | null },
): MappedAffinityLink[] {
  const data = extractCompanyArray(payload);
  const out: MappedAffinityLink[] = [];
  for (const row of data) {
    const mapped = mapAffinityCompany(row, opts);
    if (mapped) out.push(mapped);
  }
  return out;
}

function extractCompanyArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.companies)) return o.companies;
  }
  return [];
}
