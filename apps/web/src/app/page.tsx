"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import type { Me } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    api<Me>("/api/me")
      .then((m) => {
        if (!m.user) router.replace("/login");
        else if (m.needsOrg || !m.orgId) router.replace("/onboard");
        else router.replace("/command");
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  return (
    <div className="auth-shell">
      <div className="auth">
        <div className="auth-mark">Venture OS · the book</div>
        <p className="lede">Opening the book…</p>
      </div>
    </div>
  );
}
