"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from "react";
import { api, downloadAuthed } from "@/lib/api";
import { authClient, type Me } from "@/lib/auth-client";
import { isAdminRole, isLockRole, isWriteRole, roleLabel } from "@/lib/roles";
import {
  IconAsk,
  IconCommand,
  IconCompanies,
  IconCompare,
  IconFlags,
  IconInbox,
  IconNav,
  IconOrg,
  IconReports,
  IconSettings,
  IconUser,
  IconVault,
} from "@/components/Icons";

type BookSession = { me: Me | null; canWrite: boolean; isAdmin: boolean; canLock: boolean; ready: boolean };
const BookSessionContext = createContext<BookSession>({
  me: null,
  canWrite: false,
  isAdmin: false,
  canLock: false,
  ready: false,
});

/** Safe above or below <Shell>: pages mount as the parent, so we also read /api/me once. */
export function useBookSession(): BookSession {
  const ctx = useContext(BookSessionContext);
  const [me, setMe] = useState<Me | null>(ctx.me);
  const [fetched, setFetched] = useState(Boolean(ctx.me));
  useEffect(() => {
    if (ctx.me) {
      setMe(ctx.me);
      setFetched(true);
      return;
    }
    let cancelled = false;
    api<Me>("/api/me")
      .then((m) => {
        if (!cancelled) {
          setMe(m);
          setFetched(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMe(null);
          setFetched(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ctx.me]);
  const role = ctx.me?.role ?? me?.role ?? null;
  return {
    me: ctx.me ?? me,
    canWrite: isWriteRole(role),
    isAdmin: isAdminRole(role),
    canLock: isLockRole(role),
    ready: Boolean(ctx.me) || fetched,
  };
}

const NAV = [
  { href: "/command", label: "Command", hint: "Fund pulse", Icon: IconCommand },
  { href: "/companies", label: "Companies", hint: "Names on the book", Icon: IconCompanies },
  { href: "/inbox", label: "Inbox", hint: "Confirm before it posts", Icon: IconInbox },
  { href: "/flags", label: "Flags", hint: "Catalog risks", Icon: IconFlags },
  { href: "/nav", label: "NAV", hint: "Marks and lock", Icon: IconNav },
  { href: "/compare", label: "Compare", hint: "Peer metrics", Icon: IconCompare },
  { href: "/ask", label: "Ask", hint: "Cite or refuse", Icon: IconAsk },
  { href: "/reports", label: "Reports", hint: "Packs from the book", Icon: IconReports },
  { href: "/vault", label: "Vault", hint: "Source files", Icon: IconVault },
  { href: "/settings", label: "Settings", hint: "Firm, people, policy", Icon: IconSettings },
] as const;

function NavLink({
  href,
  label,
  hint,
  Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  hint: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      title={hint}
      className={active ? "active" : ""}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <Icon className="nav-ico" />
      {label}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string; fixtureOnly?: boolean }[]>([]);
  const [ready, setReady] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [orgLive, setOrgLive] = useState("");

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
          router.replace(`/login?next=${encodeURIComponent(pathRef.current)}`);
          return;
        }
        if (m.needsOrg || !m.orgId) {
          router.replace("/onboard");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) router.replace(`/login?next=${encodeURIComponent(pathRef.current)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function switchOrg(id: string) {
    if (!id || id === me?.org?.id) return;
    try {
      await api("/api/orgs/select", { method: "POST", body: JSON.stringify({ organizationId: id }) });
      const [m, o] = await Promise.all([
        api<Me>("/api/me"),
        api<{ orgs: { id: string; name: string; fixtureOnly?: boolean }[] }>("/api/orgs").catch(() => ({
          orgs: [],
        })),
      ]);
      setMe(m);
      setOrgs(o.orgs);
      setOrgLive(m.org?.name ?? "");
      router.refresh();
    } catch {
      setOrgLive("Could not switch organisation");
    }
  }

  async function signOut() {
    setMe(null);
    setReady(false);
    try {
      await api("/api/logout", { method: "POST", body: "{}" });
    } catch {
      await authClient.signOut();
    }
    router.push("/login");
  }

  const fixture = me?.org?.metadata?.includes("fixtureOnly") || Boolean(me?.org?.name.includes("FIXTURE"));
  const canWrite = isWriteRole(me?.role);
  const orgName = me?.org?.name ?? "the book";

  if (!ready) {
    return (
      <div className="auth-shell">
        <div className="auth" role="status" aria-busy="true" data-testid="shell-busy">
          <div className="auth-mark">Venture OS · the book</div>
          <p className="lede">Checking your organisation…</p>
        </div>
      </div>
    );
  }

  const groups: { title: string; items: typeof NAV }[] = [
    { title: "Morning", items: NAV.slice(0, 3) as unknown as typeof NAV },
    { title: "Rituals", items: NAV.slice(3, 8) as unknown as typeof NAV },
    { title: "Firm", items: NAV.slice(8) as unknown as typeof NAV },
  ];

  return (
    <div className="app" data-testid="shell-ready">
      <a href="#main" className="skip-link">
        Skip to book
      </a>
      <aside className="rail">
        <Link href="/command" className="brand">
          Venture OS
          <span>{orgName}</span>
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={navOpen}
          aria-controls="primary-nav"
          onClick={() => setNavOpen((v) => !v)}
        >
          Menu
        </button>
        <nav id="primary-nav" className={navOpen ? "nav is-open" : "nav"} aria-label="Primary">
          {groups.map((g) => (
            <div key={g.title}>
              <h2 className="sec">{g.title}</h2>
              {g.items.map((n) => (
                <NavLink
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  hint={n.hint}
                  Icon={n.Icon}
                  active={path.startsWith(n.href)}
                  onClick={() => setNavOpen(false)}
                />
              ))}
            </div>
          ))}
        </nav>
        {canWrite && (
          <Link href="/companies/new" className="btn rail-cta">
            New investment
          </Link>
        )}
        <div className="account" aria-label="Account">
          {orgs.length === 0 ? (
            <Link href="/onboard">Create organisation</Link>
          ) : (
            <label className="account-row">
              <IconOrg />
              <span className="sr-only">Organisation</span>
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
            </label>
          )}
          <div className="account-row">
            <IconUser />
            <div>
              <div className="who">{me?.user?.name}</div>
              <div className="who-meta">{roleLabel(me?.role)}</div>
            </div>
          </div>
          <button className="btn ghost sm" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main" id="main">
        {fixture && (
          <div className="banner" role="alert">
            FIXTURE_ONLY — illustrative rows. Not the live V3 book. Do not report these figures.
          </div>
        )}
        <div className="sr-only" aria-live="polite">
          {orgLive}
        </div>
        <BookSessionContext.Provider
          value={{
            me,
            canWrite,
            isAdmin: isAdminRole(me?.role),
            canLock: isLockRole(me?.role),
            ready: true,
          }}
        >
          {children}
        </BookSessionContext.Provider>
      </main>
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
    <button
      type="button"
      className="chip"
      title="Open source"
      aria-label={`${display} — open source`}
      onClick={() => downloadAuthed(sourcePath)}
    >
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
