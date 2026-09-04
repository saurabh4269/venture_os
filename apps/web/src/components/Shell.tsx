"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { api, downloadAuthed } from "@/lib/api";
import { authClient, type Me } from "@/lib/auth-client";
import { isAdminRole, isLockRole, isWriteRole, roleLabel } from "@/lib/roles";

type BookSession = { me: Me | null; canWrite: boolean; isAdmin: boolean; canLock: boolean };
const BookSessionContext = createContext<BookSession>({
  me: null,
  canWrite: false,
  isAdmin: false,
  canLock: false,
});

/** Safe above or below <Shell>: pages mount as the parent, so we also read /api/me. */
export function useBookSession(): BookSession {
  const ctx = useContext(BookSessionContext);
  const [me, setMe] = useState<Me | null>(ctx.me);
  useEffect(() => {
    if (ctx.me) {
      setMe(ctx.me);
      return;
    }
    api<Me>("/api/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, [ctx.me]);
  const role = ctx.me?.role ?? me?.role ?? null;
  return {
    me: ctx.me ?? me,
    canWrite: isWriteRole(role),
    isAdmin: isAdminRole(role),
    canLock: isLockRole(role),
  };
}

const NAV = [
  { href: "/command", label: "Command", hint: "Fund pulse" },
  { href: "/companies", label: "Companies", hint: "Names on the book" },
  { href: "/inbox", label: "Inbox", hint: "Confirm before it posts" },
  { href: "/flags", label: "Flags", hint: "Catalog risks" },
  { href: "/nav", label: "NAV", hint: "Marks and lock" },
  { href: "/compare", label: "Compare", hint: "Peer metrics" },
  { href: "/ask", label: "Ask", hint: "Cite or refuse" },
  { href: "/reports", label: "Reports", hint: "Packs from the book" },
  { href: "/vault", label: "Vault", hint: "Source files" },
  { href: "/settings", label: "Settings", hint: "Firm, people, policy" },
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
      <a href="#main" className="skip-link">
        Skip to book
      </a>
      <aside className="rail">
        <div className="brand">
          Venture OS
          <span>the book</span>
        </div>
        <nav className="nav" aria-label="Primary">
          <div className="sec">Morning</div>
          {NAV.slice(0, 3).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={n.hint}
              className={path.startsWith(n.href) ? "active" : ""}
              aria-current={path.startsWith(n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
          <div className="sec">Rituals</div>
          {NAV.slice(3, 8).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={n.hint}
              className={path.startsWith(n.href) ? "active" : ""}
              aria-current={path.startsWith(n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
          <div className="sec">Firm</div>
          {NAV.slice(8).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={n.hint}
              className={path.startsWith(n.href) ? "active" : ""}
              aria-current={path.startsWith(n.href) ? "page" : undefined}
            >
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
      <div className="main" id="main">
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
        <BookSessionContext.Provider
          value={{
            me,
            canWrite: isWriteRole(me?.role),
            isAdmin: isAdminRole(me?.role),
            canLock: isLockRole(me?.role),
          }}
        >
          {children}
        </BookSessionContext.Provider>
      </div>
    </div>
  );
}

export function Fact({
  display,
  isFact,
  sourcePath,
  note,
}: {
  display: string;
  isFact: boolean;
  sourcePath?: string;
  note?: string | null;
}) {
  const chip = !isFact ? (
    <span className="chip unfact">—</span>
  ) : sourcePath ? (
    <button type="button" className="chip" title="Open source" onClick={() => downloadAuthed(sourcePath)}>
      {display}
    </button>
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
