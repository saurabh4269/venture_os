"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Me } from "@/lib/auth-client";
import { friendlyAuthError, roleLabel } from "@/lib/roles";

type Invite = {
  id: string;
  email?: string;
  emailMasked?: string;
  canAccept?: boolean;
  role: string | null;
  status: string;
  expiresAt: string;
  orgName: string;
};

function InviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [invite, setInvite] = useState<Invite | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) {
      setErr("This invite link is missing its id.");
      return;
    }
    api<{ invitation: Invite }>(`/api/invitations/${id}`)
      .then((r) => setInvite(r.invitation))
      .catch(() => setErr("This invite is missing or has expired."));
    api<Me>("/api/me")
      .then(setMe)
      .catch(() => setMe({ user: null, org: null, role: null, orgId: null }));
  }, [id]);

  async function accept() {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/invitations/${id}/accept`, { method: "POST", body: "{}" });
      router.push("/command");
    } catch (ex) {
      setErr(friendlyAuthError(ex instanceof Error ? ex.message : "Could not accept"));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/invitations/${id}/reject`, { method: "POST", body: "{}" });
      router.push(me?.orgId ? "/command" : "/onboard");
    } catch (ex) {
      setErr(friendlyAuthError(ex instanceof Error ? ex.message : "Could not reject"));
    } finally {
      setBusy(false);
    }
  }

  const expired = invite ? new Date(invite.expiresAt).getTime() < Date.now() : false;
  const pending = invite?.status === "pending" && !expired;
  const signedIn = Boolean(me?.user);
  const shownEmail = invite?.email ?? invite?.emailMasked ?? "a teammate";
  const emailMatch =
    Boolean(invite?.canAccept) ||
    Boolean(signedIn && invite?.email && me?.user?.email.toLowerCase() === invite.email.toLowerCase());

  return (
    <div className="auth">
      <h1>Join an organisation</h1>
      {!invite && !err && (
        <p className="lede" aria-live="polite">
          Looking up the invite…
        </p>
      )}
      {invite && (
        <>
          <p className="lede">
            <strong>{invite.orgName}</strong> invited <strong>{shownEmail}</strong> as {roleLabel(invite.role)}.
          </p>
          {!pending && (
            <p className="sev-high" role="alert">
              {expired ? "This invite has expired." : `Status: ${invite.status}.`}
            </p>
          )}
        </>
      )}
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {pending && !signedIn && (
        <div className="row" style={{ marginTop: 16 }}>
          <Link className="btn" href={`/signup?invite=${id}`}>
            Create user
          </Link>
          <Link className="btn ghost" href={`/login?next=${encodeURIComponent(`/invite?id=${id}`)}`}>
            Sign in
          </Link>
        </div>
      )}
      {pending && signedIn && !emailMatch && (
        <p className="lede" style={{ marginTop: 16 }}>
          You are signed in as {me?.user?.email}. This invite is for {shownEmail}. Sign in with that address, or ask
          the Org Admin to send a new invite.
        </p>
      )}
      {pending && emailMatch && (
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" type="button" disabled={busy} onClick={accept}>
            {busy ? "Joining…" : "Accept invite"}
          </button>
          <button className="btn ghost" type="button" disabled={busy} onClick={reject}>
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="auth">
          <p className="lede" aria-live="polite">
            Loading invite…
          </p>
        </div>
      }
    >
      <InviteInner />
    </Suspense>
  );
}
