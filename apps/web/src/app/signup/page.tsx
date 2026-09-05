"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@venture-os/config/password";
import { api } from "@/lib/api";
import { type Me } from "@/lib/auth-client";
import { destinationAfterAuth, passwordLengthError, postAuthEmail, readAuthForm } from "@/lib/auth-form";
import { AuthFrame } from "@/components/BookUI";
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fields = readAuthForm(e.currentTarget);
    const policy = passwordLengthError(fields.password);
    if (policy) {
      setErr(policy);
      return;
    }
    if (fields.password !== fields.confirm) {
      setErr("Passwords do not match.");
      return;
    }
    if (!fields.email || !fields.name) {
      setErr("Name and work email are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await postAuthEmail("/api/auth/sign-up/email", {
        email: fields.email,
        password: fields.password,
        name: fields.name,
      });
      if (!res.ok) {
        setErr(friendlyAuthError(res.message));
        return;
      }
      const me = await api<Me>("/api/me");
      if (!me.user) {
        const dest = destinationAfterAuth(me, "/command");
        setErr(dest.ok ? "Could not sign up" : dest.message);
        return;
      }
      if (inviteId) {
        router.push(`/invite?id=${inviteId}`);
        return;
      }
      const slug = slugifyOrg(fields.org || org) || `org-${Date.now().toString(36)}`;
      try {
        await api("/api/orgs", { method: "POST", body: JSON.stringify({ name: fields.org || org, slug }) });
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
    } catch (ex) {
      setErr(friendlyAuthError(ex instanceof Error ? ex.message : "Could not sign up"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      tab="signup"
      title="Create your account."
      lede={inviteId ? undefined : "You will be Org Admin. Your book starts empty and ready for your first upload."}
      footer={
        <p className="auth-signup-link">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      }
    >
      <form method="post" onSubmit={onSubmit} className="auth-form" noValidate>
        {inviteId ? (
          <p className="lede">Create your user, then accept the invite. You join as the role you were offered.</p>
        ) : null}
        <label className="field" htmlFor="name">
          Full name
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            data-testid="signup-name"
            className="auth-field-lg"
            required
          />
        </label>
        <label className="field" htmlFor="email">
          Institutional email
          <input
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            data-testid="signup-email"
            className="auth-field-lg"
            required
          />
        </label>
        <label className="field" htmlFor="password">
          <span className="field-hint">
            Password
            <span className="lede">
              {MIN_PASSWORD_LENGTH}–{MAX_PASSWORD_LENGTH} characters
            </span>
          </span>
          <input
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
            data-testid="signup-password"
            className="auth-field-lg"
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
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
            data-testid="signup-confirm"
            className="auth-field-lg"
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
              placeholder="e.g. Your Fund GP"
              autoComplete="organization"
              data-testid="signup-org"
              className="auth-field-lg"
              required
            />
            {org && <span className="lede">Slug: {slugifyOrg(org) || "(we will assign one)"}</span>}
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
        <button className="btn auth-submit" type="submit" disabled={busy} data-testid="signup-submit">
          {busy ? "Creating account…" : inviteId ? "Create user" : "Create account"}
        </button>
      </form>
    </AuthFrame>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthFrame tab="signup">
          <p className="lede">Loading…</p>
        </AuthFrame>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
