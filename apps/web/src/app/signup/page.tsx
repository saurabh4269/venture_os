"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient, type Me } from "@/lib/auth-client";
import { friendlyAuthError, slugifyOrg } from "@/lib/roles";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteId = params.get("invite");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [org, setOrg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Me>("/api/me")
      .then((m) => {
        if (!m.user) return;
        if (inviteId) router.replace(`/invite?id=${inviteId}`);
        else if (m.needsOrg || !m.orgId) router.replace("/onboard");
        else router.replace("/command");
      })
      .catch(() => undefined);
  }, [router, inviteId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.signUp.email({ email, password, name });
      if (res.error) {
        setErr(friendlyAuthError(res.error.message ?? "Could not sign up"));
        return;
      }
      if (inviteId) {
        router.push(`/invite?id=${inviteId}`);
        return;
      }
      const slug = slugifyOrg(org) || `org-${Date.now().toString(36)}`;
      try {
        await api("/api/orgs", { method: "POST", body: JSON.stringify({ name: org, slug }) });
        router.push("/command");
      } catch (ex) {
        setErr(
          friendlyAuthError(
            ex instanceof Error
              ? ex.message
              : "User created but organisation failed — finish setup on the next screen.",
          ),
        );
        router.push("/onboard");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <h1>Open the book</h1>
      <p className="lede">
        {inviteId
          ? "Create your user, then accept the invite. You join as the role you were offered."
          : "Create your user and organisation. You will be Org Admin. You start with an empty book — upload an MIS, or run pnpm demo:vc for labelled FIXTURE_ONLY rows."}
      </p>
      <form onSubmit={onSubmit} className="field" style={{ gap: 12, marginTop: 24 }}>
        <label className="field" htmlFor="name">
          Your name
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            data-testid="signup-name"
            required
          />
        </label>
        <label className="field" htmlFor="email">
          Work email
          <input
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            data-testid="signup-email"
            required
          />
        </label>
        <label className="field" htmlFor="password">
          Password (8+ characters)
          <input
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={8}
            data-testid="signup-password"
            required
          />
        </label>
        <label className="field" htmlFor="confirm">
          Confirm password
          <input
            id="confirm"
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={8}
            data-testid="signup-confirm"
            required
          />
        </label>
        {!inviteId && (
          <label className="field" htmlFor="org">
            Organisation
            <input
              id="org"
              name="organization"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="e.g. V3 Ventures"
              autoComplete="organization"
              data-testid="signup-org"
              required
            />
            {org && (
              <span className="lede">Slug: {slugifyOrg(org) || "(we will assign one)"}</span>
            )}
          </label>
        )}
        <div className="sr-only" aria-live="polite">
          {err}
        </div>
        {err && (
          <div className="sev-high" role="alert">
            {err}
          </div>
        )}
        <button className="btn" type="submit" disabled={busy} data-testid="signup-submit">
          {busy ? "Working…" : inviteId ? "Create user" : "Create organisation"}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        Already have a login?{" "}
        <Link href={inviteId ? `/login?next=${encodeURIComponent(`/invite?id=${inviteId}`)}&email=${encodeURIComponent(email)}` : "/login"}>
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="auth">
          <p className="lede">Loading…</p>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
