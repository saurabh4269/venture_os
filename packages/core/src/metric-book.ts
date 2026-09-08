import { MetricKeySchema, UnitSchema, type MetricKey, type Unit } from "@venture-os/schema";
import { METRIC_CATALOG, type MetricDef } from "./catalog.js";

export type MetricBookOverride = {
  label?: string;
  aliases?: string[];
  defaultUnit?: Unit;
};

export type MetricBook = Partial<Record<MetricKey, MetricBookOverride>>;

/** Read-only derived rules shown in the formula book UI (not editable equations). */
export const DERIVED_METRIC_FORMULAS: Partial<Record<MetricKey, string>> = {
  runway_months: "Cash ÷ average of the last up to three booked burn months",
};

export function parseMetricBookJson(raw: unknown): MetricBook {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: MetricBook = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const keyOk = MetricKeySchema.safeParse(key);
    if (!keyOk.success) continue;
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const row = val as Record<string, unknown>;
    const next: MetricBookOverride = {};
    if (typeof row.label === "string" && row.label.trim()) {
      next.label = row.label.trim().slice(0, 80);
    }
    if (Array.isArray(row.aliases)) {
      next.aliases = row.aliases
        .map((a) => String(a).toLowerCase().replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 24);
    }
    const unitOk = UnitSchema.safeParse(row.defaultUnit);
    if (unitOk.success && unitOk.data !== "unknown") {
      next.defaultUnit = unitOk.data;
    }
    if (next.label || next.aliases || next.defaultUnit) out[keyOk.data] = next;
  }
  return out;
}

export function resolveMetricCatalog(book: MetricBook = {}): MetricDef[] {
  return METRIC_CATALOG.map((m) => {
    const o = book[m.key];
    if (!o) return m;
    return {
      ...m,
      label: o.label?.trim() || m.label,
      aliases: o.aliases?.length ? o.aliases : m.aliases,
      defaultUnit: o.defaultUnit ?? m.defaultUnit,
    };
  });
}

export function metricBookView(book: MetricBook = {}) {
  return resolveMetricCatalog(book).map((m) => {
    const base = METRIC_CATALOG.find((c) => c.key === m.key)!;
    const o = book[m.key];
    return {
      key: m.key,
      label: m.label,
      catalogLabel: base.label,
      unitFamily: m.unitFamily,
      defaultUnit: m.defaultUnit,
      catalogDefaultUnit: base.defaultUnit,
      aliases: m.aliases,
      catalogAliases: base.aliases,
      higherIsBetter: m.higherIsBetter,
      derivedFormula: DERIVED_METRIC_FORMULAS[m.key] ?? null,
      overridden: Boolean(o?.label || o?.aliases || o?.defaultUnit),
    };
  });
}

export function validateMetricBookInput(raw: unknown):
  | { ok: true; book: MetricBook }
  | { ok: false; fields: Record<string, string> } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, fields: { _book: "expected object keyed by metric" } };
  }
  const fields: Record<string, string> = {};
  const book: MetricBook = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const keyOk = MetricKeySchema.safeParse(key);
    if (!keyOk.success) {
      fields[key] = "unknown metric key";
      continue;
    }
    const base = METRIC_CATALOG.find((m) => m.key === keyOk.data);
    if (!base) {
      fields[key] = "unknown metric key";
      continue;
    }
    if (val == null) continue;
    if (typeof val !== "object" || Array.isArray(val)) {
      fields[key] = "expected { label?, aliases?, defaultUnit? }";
      continue;
    }
    const row = val as Record<string, unknown>;
    const next: MetricBookOverride = {};
    if (row.label !== undefined) {
      if (typeof row.label !== "string" || !row.label.trim()) {
        fields[`${key}.label`] = "label required when set";
      } else {
        next.label = row.label.trim().slice(0, 80);
      }
    }
    if (row.aliases !== undefined) {
      if (!Array.isArray(row.aliases)) {
        fields[`${key}.aliases`] = "aliases must be a string list";
      } else {
        next.aliases = row.aliases
          .map((a) => String(a).toLowerCase().replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .slice(0, 24);
      }
    }
    if (row.defaultUnit !== undefined) {
      const unitOk = UnitSchema.safeParse(row.defaultUnit);
      if (!unitOk.success || unitOk.data === "unknown") {
        fields[`${key}.defaultUnit`] = "invalid unit";
      } else {
        // Keep family coherent: money metrics stay money units, etc.
        const family = base.unitFamily;
        const u = unitOk.data;
        const okFamily =
          (family === "money" && ["lakh", "crore", "thousand", "million", "unit"].includes(u)) ||
          (family === "percent" && u === "percent") ||
          (family === "months" && u === "months") ||
          (family === "count" && (u === "count" || u === "unit"));
        if (!okFamily) fields[`${key}.defaultUnit`] = `unit must match ${family} family`;
        else next.defaultUnit = u;
      }
    }
    if (next.label || next.aliases || next.defaultUnit) book[keyOk.data] = next;
  }
  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, book };
}
