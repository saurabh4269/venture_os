"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@venture-os/config/password";
import { safeNextPath } from "@venture-os/config/paths";
import { api } from "@/lib/api";
import { destinationAfterAuth, passwordLengthError, postAuthEmail, readAuthForm } from "@/lib/auth-form";
import { type Me } from "@/lib/auth-client";
import { AuthFrame } from "@/components/BookUI";
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fields = readAuthForm(e.currentTarget);
    const policy = passwordLengthError(fields.password);
    if (policy) {
      setErr(policy);
      return;
    }
    if (!fields.email) {
      setErr("Enter your work email.");
      return;
    }
    setBusy(true);
    try {
      const res = await postAuthEmail("/api/auth/sign-in/email", {
        email: fields.email,
        password: fields.password,
      });
      if (!res.ok) {
        setErr(friendlyAuthError(res.message));
        return;
      }
      const me = await api<Me>("/api/me");
      const dest = destinationAfterAuth(me, next);
      if (!dest.ok) {
        setErr(dest.message);
        return;
      }
      router.push(dest.to);
    } catch (ex) {
      setErr(friendlyAuthError(ex instanceof Error ? ex.message : "Could not sign in"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      tab="signin"
      footer={
        <p className="auth-signup-link">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </p>
      }
    >
      <form method="post" onSubmit={onSubmit} className="field" style={{ gap: 14 }} noValidate>
        <label className="field" htmlFor="email">
          Email address
          <input
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            placeholder="founder@startup.com"
            data-testid="login-email"
            required
          />
        </label>
        <label className="field" htmlFor="password">
          <span className="field-hint">
            Password
            <span className="auth-forgot" title="Password reset by email is not connected">
              Forgot password?
            </span>
          </span>
          <input
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
            data-testid="login-password"
            required
          />
        </label>
        {err && (
          <div className="sev-high" role="alert">
            {err}
          </div>
        )}
        <button className="btn" type="submit" disabled={busy} data-testid="login-submit" style={{ width: "100%" }}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
        {params.get("id") ? (
          <p className="lede">
            <Link href={`/invite?id=${params.get("id")}`}>Return to invite</Link>
          </p>
        ) : null}
      </form>
    </AuthFrame>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthFrame tab="signin">
          <p className="lede">Loading…</p>
        </AuthFrame>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
