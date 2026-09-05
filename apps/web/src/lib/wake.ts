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
  slow: "Waking the book. Hosts on a free tier sleep after idle — this can take a short moment.",
  unreachable: "The book API is unreachable. Your session is kept. Try again in a moment.",
  retry: "Try again",
  retrying: "Trying again…",
} as const;
