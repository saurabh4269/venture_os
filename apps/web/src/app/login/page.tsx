"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@venture-os/config/password";
import { safeNextPath } from "@venture-os/config/paths";
import { api } from "@/lib/api";
import { destinationAfterAuth, passwordLengthError, postAuthEmail, readAuthForm } from "@/lib/auth-form";
import { type Me } from "@/lib/auth-client";
import { AuthFrame } from "@/components/BookUI";
import { friendlyAuthError } from "@/lib/roles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

function loginLede(next: string) {
  if (next === "/command") return "Sign in to open Command and see what needs attention today.";
  if (next.startsWith("/inbox")) return "Sign in to review Inbox rows before they join the book.";
  return "Use your firm email and password. Your fund admin can help with access.";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

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
    if (policy) { setErr(policy); return; }
    if (!fields.email) { setErr("Enter your work email."); return; }
    setBusy(true);
    try {
      const res = await postAuthEmail("/api/auth/sign-in/email", { email: fields.email, password: fields.password });
      if (!res.ok) { setErr(friendlyAuthError(res.message)); return; }
      const me = await api<Me>("/api/me");
      const dest = destinationAfterAuth(me, next);
      if (!dest.ok) { setErr(dest.message); return; }
      setDone(true);
      router.push(dest.to);
    } catch (ex) {
      setErr(friendlyAuthError(ex instanceof Error ? ex.message : "Could not sign in"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame tab="signin" title="Sign in to your book." lede={loginLede(next)}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <form method="post" onSubmit={onSubmit} className="auth-form flex flex-col gap-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder="you@firm.com"
              className="auth-field-lg"
              data-testid="login-email"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <span className="auth-forgot" title="Contact your fund admin for a password reset">
                Ask your fund admin
              </span>
            </div>
            <PasswordInput
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={MAX_PASSWORD_LENGTH}
              className="auth-field-lg"
              data-testid="login-password"
              required
            />
          </div>
          {err && <div className="sev-high text-sm" role="alert">{err}</div>}
          <button type="submit" disabled={busy || done} className="btn auth-submit" data-testid="login-submit">
            {done ? "Signed in" : busy ? "Signing in…" : "Sign in"}
          </button>
          {params.get("id") ? (
            <p className="lede text-sm"><Link href={`/invite?id=${params.get("id")}`}>Return to invite</Link></p>
          ) : null}
        </form>
        <p className="auth-login-link">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </p>
      </motion.div>
    </AuthFrame>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFrame tab="signin" title="Sign in to your book."><p className="lede">Loading…</p></AuthFrame>}>
      <LoginForm />
    </Suspense>
  );
}
