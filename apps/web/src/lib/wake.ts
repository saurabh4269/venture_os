import { INVALID_JSON_MESSAGE, TRUNCATED_JSON_MESSAGE, UPSTREAM_UNAVAILABLE_MESSAGE } from "./api";

/** Errors that mean the book API is cold, truncated, or unreachable — not “please sign in”. */
export function isWakeError(message: string): boolean {
  const t = message.toLowerCase();
  return (
    message === UPSTREAM_UNAVAILABLE_MESSAGE ||
    message === TRUNCATED_JSON_MESSAGE ||
    message === INVALID_JSON_MESSAGE ||
    t.includes("upstream_unavailable") ||
    t.includes("failed to fetch") ||
    t.includes("networkerror") ||
    t.includes("network error") ||
    t.includes("load failed") ||
    t.includes("truncated") ||
    t.includes("not valid json")
  );
}

export function bookErrorMessage(raw: string): string {
  return isWakeError(raw) ? WAKING_COPY.unreachable : raw;
}

export const WAKING_COPY = {
  checking: "Checking your organisation…",
  slow: "Waking the book. Hosts on a free tier sleep after idle. This can take a short moment.",
  unreachable: "The book API is unreachable. Your session is kept. Try again in a moment.",
  retry: "Try again",
  retrying: "Trying again…",
} as const;

/** Client-side cold-start retries (BFF times out before Render finishes waking). */
export const WAKE_AUTO_RETRY = {
  maxAttempts: 12,
  /** Delay before the first re-fetch after the initial /api/me failure. */
  firstDelayMs: 800,
  initialDelayMs: 2_500,
  maxDelayMs: 10_000,
} as const;

/** Backoff between wake attempts after the first (attempt is 0-based). */
export function nextWakeDelayMs(attempt: number): number {
  const n = Math.max(0, attempt);
  const raw = WAKE_AUTO_RETRY.initialDelayMs * 1.35 ** n;
  return Math.min(Math.round(raw), WAKE_AUTO_RETRY.maxDelayMs);
}

/** Fire-and-forget / poll same-origin health to start or confirm upstream wake. */
export async function pingBookHealth(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl("/api/health", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return res.ok && data?.ok === true;
  } catch {
    return false;
  }
}
