export type RetrievedChunk = {
  documentId: string;
  sourceRefId: string | null;
  excerpt: string;
  rank: number;
};

export type BookFactHit = {
  sourceRefId: string;
  documentId: string;
  excerpt: string;
};

export type AskEvidence = {
  chunks: RetrievedChunk[];
  facts: BookFactHit[];
};

export type AskDecision =
  | { ok: true; evidence: AskEvidence }
  | { ok: false; reason: "empty_corpus" | "no_overlap" };

const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "or",
  "to",
  "in",
  "for",
  "on",
  "is",
  "what",
  "how",
  "was",
  "are",
  "did",
  "does",
]);

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function filterEvidenceByTokens(evidence: AskEvidence, tokens: string[]): AskEvidence {
  if (!tokens.length) return evidence;
  const hit = (excerpt: string) => {
    const low = excerpt.toLowerCase();
    return tokens.some((t) => low.includes(t));
  };
  return {
    chunks: evidence.chunks.filter((c) => hit(c.excerpt)),
    facts: evidence.facts.filter((f) => hit(f.excerpt)),
  };
}

/** Refuse unless we have at least one retrieved chunk or book fact that overlaps the question. */
export function decideAsk(evidence: AskEvidence, tokens: string[] = []): AskDecision {
  const scoped = filterEvidenceByTokens(evidence, tokens);
  if (scoped.chunks.length === 0 && scoped.facts.length === 0) {
    return { ok: false, reason: evidence.chunks.length === 0 && evidence.facts.length === 0 ? "empty_corpus" : "no_overlap" };
  }
  return { ok: true, evidence: scoped };
}

export function numbersIn(text: string): string[] {
  return [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => m[0]!);
}

/** Any numeral in the answer that does not appear in evidence is an invention. */
export function inventedNumbers(answer: string, evidenceText: string): string[] {
  const allowed = new Set(numbersIn(evidenceText));
  return numbersIn(answer).filter((n) => !allowed.has(n));
}

export const ASK_REFUSAL =
  "Not in the book / corpus — I will not guess. Upload a source or confirm the figure in Inbox.";

export function evidenceText(evidence: AskEvidence): string {
  return [...evidence.facts.map((f) => f.excerpt), ...evidence.chunks.map((c) => c.excerpt)].join("\n");
}

/**
 * Any numeral in the answer that is not in evidence is an invention.
 * Refuse — do not strip digits and pretend the rest is grounded.
 */
export function refuseUnsourcedDigits(
  answer: string,
  evidence: AskEvidence | string,
): { ok: true; answer: string } | { ok: false; invented: string[] } {
  const text = typeof evidence === "string" ? evidence : evidenceText(evidence);
  const invented = inventedNumbers(answer, text);
  if (invented.length) return { ok: false, invented };
  return { ok: true, answer };
}

export function citationsFrom(evidence: AskEvidence) {
  const fromChunks = evidence.chunks.map((c) => ({
    documentId: c.documentId,
    sourceRefId: c.sourceRefId,
    excerpt: c.excerpt.slice(0, 400),
  }));
  const fromFacts = evidence.facts.map((f) => ({
    documentId: f.documentId,
    sourceRefId: f.sourceRefId,
    excerpt: f.excerpt.slice(0, 400),
  }));
  const seen = new Set<string>();
  const out = [];
  for (const c of [...fromFacts, ...fromChunks]) {
    const k = `${c.documentId}:${c.sourceRefId}:${c.excerpt.slice(0, 40)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}
