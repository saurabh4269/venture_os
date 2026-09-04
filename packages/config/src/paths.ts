/** Reject protocol-relative and scheme-bearing `next` values (`//evil`, `/\\`, `://`). */
export function isSafeInternalPath(next: string | null | undefined): next is string {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("://")) return false;
  if (next.includes("\\")) return false;
  if (/%2f%2f/i.test(next) || /%5c/i.test(next)) return false;
  return true;
}

export function safeNextPath(next: string | null | undefined, fallback = "/command"): string {
  return isSafeInternalPath(next) ? next : fallback;
}
