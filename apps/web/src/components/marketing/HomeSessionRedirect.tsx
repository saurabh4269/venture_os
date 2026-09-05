"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import type { Me } from "@/lib/auth-client";

/**
 * After first paint: if a session cookie exists, send the user to the book.
 * Anonymous visitors never wait on the API — the hint is Next-only.
 */
export function HomeSessionRedirect() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const hintRes = await fetch("/api/session-hint", { credentials: "include", cache: "no-store" });
      const hint = (await hintRes.json().catch(() => null)) as { hasSession?: boolean } | null;
      if (cancelled || !hint?.hasSession) return;
      const me = await api<Me>("/api/me");
      if (cancelled || !me.user) return;
      router.replace(me.needsOrg || !me.orgId ? "/onboard" : "/command");
    };
    const t = window.setTimeout(() => {
      void run().catch(() => undefined);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [router]);
  return null;
}
