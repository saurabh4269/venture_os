import { describe, expect, it } from "vitest";
import { BOOK_KEEPALIVE_MS, NAV_PREFETCH, prefetchPathsForHref } from "./book-prefetch";

describe("book-prefetch", () => {
  it("maps ritual nav hrefs to API warm paths", () => {
    expect(prefetchPathsForHref("/command")).toEqual(["/api/command"]);
    expect(prefetchPathsForHref("/flags")).toEqual(["/api/flags"]);
    expect(prefetchPathsForHref("/confirm")).toEqual(["/api/inbox"]);
    expect(NAV_PREFETCH["/companies"]).toContain("/api/companies");
  });

  it("returns empty for unknown or detail hrefs", () => {
    expect(prefetchPathsForHref("/companies/abc")).toEqual([]);
    expect(prefetchPathsForHref("/unknown")).toEqual([]);
  });

  it("keeps keepalive under the free-tier sleep window", () => {
    expect(BOOK_KEEPALIVE_MS).toBeLessThan(15 * 60 * 1000);
    expect(BOOK_KEEPALIVE_MS).toBeGreaterThan(60_000);
  });
});
