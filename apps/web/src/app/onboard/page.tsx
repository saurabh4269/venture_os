"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Me } from "@/lib/auth-client";
import { AuthFrame } from "@/components/BookUI";
import { friendlyAuthError, slugifyOrg } from "@/lib/roles";

export default function OnboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    api<Me>("/api/me")
      .then((m) => {
        if (!m.user) {
          router.replace("/login?next=/onboard");
          return;
        }
        setUserName(m.user.name);
        if (m.orgId && !m.needsOrg) router.replace("/command");
      })
      .catch(() => router.replace("/login?next=/onboard"));
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
            placeholder="e.g. V3 Ventures"
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
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create organisation"}
        </button>
      </form>
      <p className="lede" style={{ marginTop: 16 }}>
        Have an invite? Open the link you were sent. Domain auto-join is not connected.
      </p>
      <p style={{ marginTop: 8 }}>
        <Link href="/login">Use a different account</Link>
      </p>
    </AuthFrame>
  );
}
