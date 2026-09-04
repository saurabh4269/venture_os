import type { Currency, Unit } from "@venture-os/schema";
import { isPresent, type Num } from "./nulls.js";

/** Convert a native money amount into INR crore. Unknown unit → null (do not guess). */
export function toInrCrore(value: Num, unit: Unit, currency: Currency): Num {
  if (!isPresent(value)) return null;
  if (currency !== "INR") return null;
  switch (unit) {
    case "crore":
      return value;
    case "lakh":
      return value / 100;
    case "thousand":
      return value / 10_000;
    case "million":
      return value * 10;
    case "unit":
      return value / 10_000_000;
    case "unknown":
    case "percent":
    case "months":
    case "count":
      return null;
  }
}

export type FxTriple = {
  fxRate: number;
  fxDate: string;
  fxSource: string;
};

/**
 * Dual display. Converted EUR is only a fact when the FX triple is complete.
 * Rate convention: 1 INR = fxRate EUR? No — we store "INR per 1 EUR" would be confusing.
 * Locked: fxRate = EUR per 1 unit of native currency (e.g. EUR per 1 INR).
 */
export function toEur(native: Num, currency: Currency, fx: Partial<FxTriple> | null): Num {
  if (!isPresent(native) || !fx) return null;
  const rate = fx.fxRate;
  if (!isPresent(rate ?? null) || !fx.fxDate || !fx.fxSource) return null;
  if (currency === "EUR") return native;
  if (currency === "unknown") return null;
  return native * rate!;
}

export function detectUnit(text: string): Unit | "ambiguous" {
  const t = text.toLowerCase();
  const hits: Unit[] = [];
  if (/\bcrore\b|\bcr\b|\binr\s*cr\b|\brs\.?\s*cr\b/.test(t)) hits.push("crore");
  if (/\blakh\b|\blacs?\b|\binr\s*lakh\b/.test(t)) hits.push("lakh");
  if (/\bmillion\b|\bmn\b|\busd\s*m\b/.test(t)) hits.push("million");
  if (/\bthousand\b|\b'000\b|\bk\b/.test(t)) hits.push("thousand");
  if (/\bpercent\b|\bpct\b|%/.test(t)) hits.push("percent");
  if (/\bmonths?\b|\bmo\b/.test(t)) hits.push("months");
  const unique = [...new Set(hits)];
  if (unique.length === 0) return "unknown";
  if (unique.length > 1) return "ambiguous";
  return unique[0]!;
}

export function detectCurrency(text: string): Currency {
  const t = text.toLowerCase();
  if (/\beur\b|€|euro/.test(t)) return "EUR";
  if (/\busd\b|\$|dollar/.test(t)) return "USD";
  if (/\bgbp\b|£|pound/.test(t)) return "GBP";
  if (/\binr\b|₹|rs\.?|rupee/.test(t)) return "INR";
  return "unknown";
}

export function formatMoney(value: Num, unit: Unit, currency: Currency): string {
  if (!isPresent(value)) return "—";
  const cur = currency === "unknown" ? "" : `${currency} `;
  const u = unit === "unit" || unit === "unknown" ? "" : ` ${unit}`;
  return `${cur}${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${u}`.trim();
}
