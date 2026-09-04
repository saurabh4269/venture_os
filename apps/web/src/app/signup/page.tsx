"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await authClient.signUp.email({ email, password, name });
    if (res.error) {
      setErr(res.error.message ?? "Could not sign up");
      return;
    }
    const slug = org
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const orgRes = await authClient.organization.create({ name: org, slug });
    if (orgRes.error) {
      setErr(orgRes.error.message ?? "User created but org failed — create it from Settings");
      return;
    }
    if (orgRes.data?.id) {
      await authClient.organization.setActive({ organizationId: orgRes.data.id });
    }
    router.push("/command");
  }

  return (
    <div className="auth">
      <h1>Open the book</h1>
      <p className="lede">Create your user and organisation. You will be Org Admin.</p>
      <form onSubmit={onSubmit} className="field" style={{ gap: 12, marginTop: 24 }}>
        <label className="field">
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          Work email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label className="field">
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
        </label>
        <label className="field">
          Organisation
          <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. V3 Ventures" required />
        </label>
        {err && <div className="sev-high">{err}</div>}
        <button className="btn" type="submit">
          Create organisation
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        Already have a login? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
