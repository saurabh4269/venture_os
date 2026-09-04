"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await authClient.signIn.email({ email, password });
    if (res.error) setErr(res.error.message ?? "Could not sign in");
    else router.push("/command");
  }

  return (
    <div className="auth">
      <h1>Venture OS</h1>
      <p className="lede">The book for the investment team. Sign in to your organisation.</p>
      <form onSubmit={onSubmit} className="field" style={{ gap: 12, marginTop: 24 }}>
        <label className="field">
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label className="field">
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {err && <div className="sev-high">{err}</div>}
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        New firm? <Link href="/signup">Create an organisation</Link>
      </p>
    </div>
  );
}
