"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient, type Me } from "@/lib/auth-client";
import { roleLabel } from "@/lib/roles";

const NAV = [
  { href: "/command", label: "Command" },
  { href: "/companies", label: "Companies" },
  { href: "/inbox", label: "Inbox" },
  { href: "/flags", label: "Flags" },
  { href: "/nav", label: "NAV" },
  { href: "/compare", label: "Compare" },
  { href: "/ask", label: "Ask" },
  { href: "/reports", label: "Reports" },
  { href: "/vault", label: "Vault" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string; fixtureOnly?: boolean }[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<Me>("/api/me"),
      api<{ orgs: { id: string; name: string; fixtureOnly?: boolean }[] }>("/api/orgs").catch(() => ({
        orgs: [],
      })),
    ])
      .then(([m, o]) => {
        if (cancelled) return;
        setMe(m);
        setOrgs(o.orgs);
        if (!m.user) {
          router.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }
        if (m.needsOrg || !m.orgId) {
          router.replace("/onboard");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) router.replace(`/login?next=${encodeURIComponent(path)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [router, path]);

  async function switchOrg(id: string) {
    if (!id || id === me?.org?.id) return;
    await api("/api/orgs/select", { method: "POST", body: JSON.stringify({ organizationId: id }) });
    window.location.reload();
  }

  async function signOut() {
    try {
      await api("/api/logout", { method: "POST", body: "{}" });
    } catch {
      await authClient.signOut();
    }
    router.push("/login");
  }

  const fixture = me?.org?.metadata?.includes("fixtureOnly") || me?.org?.name.includes("FIXTURE");

  if (!ready) {
    return (
      <div className="auth">
        <p className="lede">Checking your organisation…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          Venture OS
          <span>the book</span>
        </div>
        <nav className="nav" aria-label="Primary">
          <div className="sec">Morning</div>
          {NAV.slice(0, 3).map((n) => (
            <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? "active" : ""}>
              {n.label}
            </Link>
          ))}
          <div className="sec">Book</div>
          {NAV.slice(3, 8).map((n) => (
            <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? "active" : ""}>
              {n.label}
            </Link>
          ))}
          <div className="sec">Firm</div>
          {NAV.slice(8).map((n) => (
            <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? "active" : ""}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: "auto", fontSize: 12, color: "var(--muted)" }}>
          <div>{me?.user?.name}</div>
          <div>{roleLabel(me?.role)}</div>
          <button className="btn ghost sm" type="button" style={{ marginTop: 8 }} onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        {fixture && (
          <div className="banner" role="status">
            FIXTURE_ONLY — illustrative rows. Not the live V3 book. Do not report these figures.
          </div>
        )}
        <div className="top">
          <div />
          <div className="row">
            {orgs.length === 0 ? (
              <Link href="/onboard">Create organisation</Link>
            ) : (
              <select
                value={me?.org?.id ?? ""}
                onChange={(e) => switchOrg(e.target.value)}
                aria-label="Organisation"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Fact({
  display,
  isFact,
  href,
  note,
}: {
  display: string;
  isFact: boolean;
  href?: string;
  note?: string | null;
}) {
  const chip = !isFact ? (
    <span className="chip unfact">—</span>
  ) : href ? (
    <a className="chip" href={href} title="Open source">
      {display}
    </a>
  ) : (
    <span className="chip">{display}</span>
  );
  if (!note) return chip;
  return (
    <span>
      {chip}
      <span className="lede" style={{ display: "block", marginTop: 2 }}>
        {note}
      </span>
    </span>
  );
}
