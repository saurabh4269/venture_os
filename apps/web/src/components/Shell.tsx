"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

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

type Me = {
  user: { id: string; name: string; email: string } | null;
  org: { id: string; name: string; metadata?: string | null } | null;
  role: string | null;
};

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string; fixtureOnly?: boolean }[]>([]);

  useEffect(() => {
    api<Me>("/api/me")
      .then((m) => {
        setMe(m);
        if (!m.user) router.replace("/login");
      })
      .catch(() => router.replace("/login"));
    api<{ orgs: { id: string; name: string; fixtureOnly?: boolean }[] }>("/api/orgs")
      .then((r) => setOrgs(r.orgs))
      .catch(() => undefined);
  }, [router]);

  async function switchOrg(id: string) {
    await api("/api/orgs/select", { method: "POST", body: JSON.stringify({ organizationId: id }) });
    window.location.reload();
  }

  const fixture = me?.org?.metadata?.includes("fixtureOnly") || me?.org?.name.includes("FIXTURE");

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          Venture OS
          <span>the book</span>
        </div>
        <nav className="nav">
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
          <div>{me?.role?.replace("_", " ")}</div>
          <button
            className="btn ghost sm"
            style={{ marginTop: 8 }}
            onClick={() => authClient.signOut().then(() => router.push("/login"))}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        {fixture && (
          <div className="banner">
            FIXTURE_ONLY — illustrative rows. Not the live V3 book. Do not report these figures.
          </div>
        )}
        <div className="top">
          <div />
          <div className="row">
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
}: {
  display: string;
  isFact: boolean;
  href?: string;
}) {
  if (!isFact) return <span className="chip unfact">—</span>;
  if (href) {
    return (
      <a className="chip" href={href} title="Open source">
        {display}
      </a>
    );
  }
  return <span className="chip">{display}</span>;
}
