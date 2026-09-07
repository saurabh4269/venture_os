/**
 * Fuzzy ranking for *proposal assist only* — never writes the book.
 * Exact / numeric ±1% / token ratio. Cap candidates. Missing ≠ 0.
 */

export type FuzzyCandidate = {
  id: string;
  value: string;
  /** Optional numeric for ±1% band. */
  numeric?: number | null;
  label?: string;
};

export type FuzzyHit = {
  id: string;
  confidence: number;
  mode: "exact" | "numeric" | "ratio";
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[,_\s]+/g, "").trim();
}

/** Simple ratio 0–1 (Levenshtein-ish via shared bigrams — cheap, no dep). */
export function tokenRatio(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bigrams = (s: string) => {
    const set = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      set.set(g, (set.get(g) ?? 0) + 1);
    }
    return set;
  };
  const A = bigrams(x);
  const B = bigrams(y);
  let overlap = 0;
  for (const [g, c] of A) overlap += Math.min(c, B.get(g) ?? 0);
  const total = Math.max(1, [...A.values()].reduce((s, n) => s + n, 0) + [...B.values()].reduce((s, n) => s + n, 0));
  return (2 * overlap) / total;
}

/**
 * Rank candidates against a query string / number.
 * threshold default 0.85. Numeric band ±1%.
 */
export function rankFuzzyCandidates(
  query: { text: string; numeric?: number | null },
  candidates: FuzzyCandidate[],
  opts?: { threshold?: number; topK?: number; corpusCap?: number },
): FuzzyHit[] {
  const threshold = opts?.threshold ?? 0.85;
  const topK = opts?.topK ?? 5;
  const cap = opts?.corpusCap ?? 20_000;
  const pool = candidates.slice(0, cap);
  const hits: FuzzyHit[] = [];
  const qNorm = norm(query.text);
  const qNum = query.numeric;

  for (const c of pool) {
    const cNorm = norm(c.value);
    if (qNorm && cNorm && qNorm === cNorm) {
      hits.push({ id: c.id, confidence: 0.95, mode: "exact" });
      continue;
    }
    if (qNum != null && c.numeric != null && Number.isFinite(qNum) && Number.isFinite(c.numeric) && qNum !== 0) {
      const rel = Math.abs(qNum - c.numeric) / Math.abs(qNum);
      if (rel <= 0.01) {
        hits.push({ id: c.id, confidence: 0.95, mode: "numeric" });
        continue;
      }
    }
    const label = c.label ?? c.value;
    const r = Math.max(tokenRatio(query.text, c.value), tokenRatio(query.text, label));
    if (r >= threshold) hits.push({ id: c.id, confidence: r, mode: "ratio" });
  }

  return hits.sort((a, b) => b.confidence - a.confidence).slice(0, topK);
}

/**
 * Evidence status for inbox UX — unverifiable ≠ wrong.
 * cited: locator resolvable; weak: low confidence; unverifiable: no cite path.
 */
export type EvidenceStatus = "cited" | "weak" | "unverifiable";

export function evidenceStatusOf(args: {
  confidence: number;
  hasLocator: boolean;
  unitUnknown?: boolean;
}): EvidenceStatus {
  if (args.unitUnknown) return "weak";
  if (!args.hasLocator) return "unverifiable";
  if (args.confidence < 0.5) return "weak";
  return "cited";
}

/**
 * Suggest a catalog metric via fuzzy rank when exact alias match failed.
 * Propose-only: callers must keep confidence ≤ 0.55 and never auto-confirm.
 */
export function suggestCatalogMetricFuzzy(
  label: string,
  catalog: { key: string; label: string; aliases: string[] }[],
  opts?: { threshold?: number },
): { key: string; confidence: number; mode: FuzzyHit["mode"] } | null {
  const text = label.trim();
  if (!text) return null;
  const n = norm(text);

  // Containment of longer phrases (≥8 chars after norm) — still propose-only.
  let contain: { key: string; len: number } | null = null;
  for (const m of catalog) {
    for (const a of [m.label, ...m.aliases]) {
      const al = norm(a);
      if (al.length < 8) continue;
      if (n.includes(al) || al.includes(n)) {
        if (!contain || al.length > contain.len) contain = { key: m.key, len: al.length };
      }
    }
  }
  if (contain) {
    return { key: contain.key, confidence: 0.5, mode: "ratio" };
  }

  const candidates: FuzzyCandidate[] = catalog.flatMap((m) => [
    { id: m.key, value: m.label, label: m.label },
    ...m.aliases.map((a) => ({ id: m.key, value: a, label: m.label })),
  ]);
  const [hit] = rankFuzzyCandidates(
    { text },
    candidates,
    { threshold: opts?.threshold ?? 0.78, topK: 1 },
  );
  if (!hit) return null;
  return {
    key: hit.id,
    confidence: Math.min(0.55, hit.confidence * 0.6),
    mode: hit.mode,
  };
}
