/** While a book tab is open, ping health so free-tier API stays warm. */
export const BOOK_KEEPALIVE_MS = 8 * 60 * 1000;

/** API paths to warm when hovering a nav href. */
export const NAV_PREFETCH: Record<string, string[]> = {
  "/command": ["/api/command"],
  "/companies": ["/api/companies", "/api/command"],
  "/confirm": ["/api/inbox"],
  "/inbox": ["/api/inbox"],
  "/sources": ["/api/documents"],
  "/vault": ["/api/documents"],
  "/flags": ["/api/flags"],
  "/nav": ["/api/nav"],
  "/compare": ["/api/compare"],
  "/reports": ["/api/reports"],
  "/settings": ["/api/settings", "/api/funds", "/api/members"],
  "/ask": [],
};

export function prefetchPathsForHref(href: string): string[] {
  const exact = NAV_PREFETCH[href];
  if (exact) return exact;
  return [];
}
