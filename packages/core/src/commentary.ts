export type CommentaryLane = "objective" | "subjective";

/** Sources we already store as `documents.kind`. Do not invent vendor field names. */
export type CommentarySourceKind = "mis" | "transcript" | "human";

export function documentKindToCommentarySource(kind: string | null | undefined): CommentarySourceKind {
  const k = (kind ?? "").toLowerCase();
  if (k === "granola" || k === "transcript" || k === "call") return "transcript";
  if (k === "mis" || k === "xlsx" || k === "xls" || k === "csv" || k === "pdf" || k === "financials") {
    return "mis";
  }
  return "human";
}

/**
 * Subjective commentary is never drafted or confirmed from MIS-only input.
 * Human judgement notes are allowed (they are not MIS extracts).
 */
export function assertCommentaryLane(
  lane: CommentaryLane,
  sourceKind: CommentarySourceKind,
): { ok: true } | { ok: false; code: "subjective_rejects_mis_only" } {
  if (lane === "subjective" && sourceKind === "mis") {
    return { ok: false, code: "subjective_rejects_mis_only" };
  }
  return { ok: true };
}
