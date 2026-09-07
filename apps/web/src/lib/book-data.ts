import { preload } from "swr";
import { api } from "@/lib/api";
import { prefetchPathsForHref } from "@/lib/book-prefetch";

export { BOOK_KEEPALIVE_MS, NAV_PREFETCH, prefetchPathsForHref } from "@/lib/book-prefetch";

export const bookFetcher = <T,>(path: string) => api<T>(path);

/** Default SWR options for book reads — show cached rows immediately on tab switch. */
export const bookSwrOptions = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 8_000,
  keepPreviousData: true,
  errorRetryCount: 2,
} as const;

export function prefetchBookApis(href: string) {
  for (const path of prefetchPathsForHref(href)) {
    void preload(path, bookFetcher);
  }
}
