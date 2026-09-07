"use client";

import { SWRConfig } from "swr";
import { Shell } from "@/components/Shell";
import { bookFetcher, bookSwrOptions } from "@/lib/book-data";

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher: bookFetcher, ...bookSwrOptions }}>
      <Shell>{children}</Shell>
    </SWRConfig>
  );
}
