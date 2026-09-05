"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Me } from "@/lib/auth-client";
import { AuthFrame } from "@/components/BookUI";
import { WakingBook } from "@/components/WakingBook";
import { friendlyAuthError, slugifyOrg } from "@/lib/roles";
import { UPSTREAM_UNAVAILABLE_MESSAGE } from "@/lib/api";
import { isWakeError, WAKING_COPY } from "@/lib/wake";

export default function OnboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [userName, setUserName] = useState("");
  const [wake, setWake] = useState<"ok" | "loading" | "error">("loading");

  function loadMe() {
    setWake("loading");
    api<Me>("/api/me")
      .then((m) => {
        if (!m.user) {
          router.replace("/login?next=/onboard");
          return;
        }
        setUserName(m.user.name);
        setWake("ok");
        if (m.orgId && !m.needsOrg) router.replace("/command");
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : UPSTREAM_UNAVAILABLE_MESSAGE;
        if (isWakeError(msg)) {
          setWake("error");
          setErr(msg);
          return;
        }
        router.replace("/login?next=/onboard");
      });
  }

  useEffect(() => {
    loadMe();
    // First mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const slug = slugifyOrg(name) || `org-${Date.now().toString(36)}`;
      await api("/api/orgs", { method: "POST", body: JSON.stringify({ name, slug }) });
      router.push("/command");
    } catch (ex) {
      setErr(friendlyAuthError(ex instanceof Error ? ex.message : "Could not create organisation"));
    } finally {
      setBusy(false);
    }
  }

  if (wake === "loading" || wake === "error") {
    return (
      <WakingBook
        message={wake === "error" ? WAKING_COPY.unreachable : WAKING_COPY.checking}
        onRetry={wake === "error" ? loadMe : undefined}
        busy={wake === "loading"}
        testId="onboard-busy"
      />
    );
  }

  return (
    <AuthFrame>
      <h1>Create the firm book</h1>
      <p className="lede">
        {userName ? `${userName}, you` : "You"} are signed in but not in an organisation yet. Create one
        (you become Org Admin) or accept an invite link from a colleague.
      </p>
      <form onSubmit={onSubmit} className="field" style={{ gap: 12, marginTop: 24 }}>
        <label className="field" htmlFor="org">
          Organisation name
          <input
            id="org"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Your Fund GP"
            autoComplete="organization"
            required
          />
          {name && <span className="lede">Slug: {slugifyOrg(name) || "(we will assign one)"}</span>}
        </label>
        {err && (
          <div className="sev-high" role="alert">
            {err}
          </div>
        )}
        <button className="btn auth-submit" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create organisation"}
        </button>
      </form>
      <p className="lede" style={{ marginTop: 16 }}>
        Have an invite? Open the link from your colleague.
      </p>
      <p style={{ marginTop: 8 }}>
        <Link href="/login">Use a different account</Link>
      </p>
    </AuthFrame>
  );
}
