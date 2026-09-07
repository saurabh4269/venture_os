/**
/**
 * Job / parse phase badges.
 * Derived display only — never invents success.
 */

export type ParsePhase =
  | "queued"
  | "running"
  | "done"
  | "error"
  | "stalled"
  | "unknown";

/** Stall if running longer than this without finish (ms). */
export const PARSE_STALL_MS = 10 * 60 * 1000;

export function deriveParsePhase(args: {
  status?: string | null;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
  error?: string | null;
  now?: number;
}): ParsePhase {
  const status = (args.status ?? "").toLowerCase();
  if (status === "done") return "done";
  if (status === "error" || args.error) return "error";
  if (status === "queued" || status === "pending") return "queued";
  if (status === "running") {
    const started = args.startedAt ? new Date(args.startedAt).getTime() : NaN;
    const now = args.now ?? Date.now();
    if (Number.isFinite(started) && now - started > PARSE_STALL_MS) return "stalled";
    return "running";
  }
  return status ? "unknown" : "queued";
}

export function parsePhaseLabel(phase: ParsePhase): string {
  switch (phase) {
    case "queued":
      return "Queued";
    case "running":
      return "Parsing";
    case "done":
      return "Ready";
    case "error":
      return "Failed";
    case "stalled":
      return "Stalled";
    default:
      return "Unknown";
  }
}
