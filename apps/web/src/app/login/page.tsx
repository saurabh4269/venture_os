"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { safeNextPath } from "@venture-os/config/paths";
import { api } from "@/lib/api";
import { authClient, type Me } from "@/lib/auth-client";
import { friendlyAuthError } from "@/lib/roles";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Me>("/api/me")
      .then((m) => {
        if (m.user && (m.orgId || !m.needsOrg)) router.replace(next);
        else if (m.user) router.replace("/onboard");
      })
      .catch(() => undefined);
  }, [router, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setErr(friendlyAuthError(res.error.message ?? "Could not sign in"));
        return;
      }
      const me = await api<Me>("/api/me");
      if (me.needsOrg || !me.orgId) router.push("/onboard");
      else router.push(next);
    } catch (ex) {
      setErr(friendlyAuthError(ex instanceof Error ? ex.message : "Could not sign in"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <h1>Venture OS</h1>
      <p className="lede">
        The book for the investment team. Sessions last 7 days and refresh daily. SSO and password reset by email are
        not connected.
      </p>
      <form onSubmit={onSubmit} className="field" style={{ gap: 12, marginTop: 24 }} noValidate>
        <label className="field" htmlFor="email">
          Work email
          <input
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            data-testid="login-email"
            required
          />
        </label>
        <label className="field" htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            data-testid="login-password"
            required
          />
        </label>
        {err && (
          <div className="sev-high" role="alert">
            {err}
          </div>
        )}
        <button className="btn" type="submit" disabled={busy} data-testid="login-submit">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        New firm? <Link href="/signup">Create an organisation</Link>
        {params.get("id") ? (
          <>
            {" "}
            · <Link href={`/invite?id=${params.get("id")}`}>Return to invite</Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="auth">
          <p className="lede">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
