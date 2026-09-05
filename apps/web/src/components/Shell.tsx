"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from "react";
import { HelpCircle, Search } from "lucide-react";
import { api } from "@/lib/api";
import { authClient, type Me } from "@/lib/auth-client";
import { isAdminRole, isLockRole, isWriteRole, roleLabel } from "@/lib/roles";
import { Pipeline } from "@/components/BookUI";
import { CiteProvider, useCite, type CitePayload } from "@/components/Cite";
import { WakingBook } from "@/components/WakingBook";
import { UPSTREAM_UNAVAILABLE_MESSAGE } from "@/lib/api";
import { isWakeError, WAKING_COPY } from "@/lib/wake";
import {
  IconAsk,
  IconCommand,
  IconCompanies,
  IconCompare,
  IconFlags,
  IconInbox,
  IconNav,
  IconReports,
  IconSettings,
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
  { href: "/command", label: "Command", Icon: IconCommand },
  { href: "/inbox", label: "Inbox", Icon: IconInbox },
  { href: "/flags", label: "Flags", Icon: IconFlags },
  { href: "/companies", label: "Companies", Icon: IconCompanies },
  { href: "/ask", label: "Ask", Icon: IconAsk },
  { href: "/nav", label: "NAV", Icon: IconNav },
  { href: "/compare", label: "Compare", Icon: IconCompare },
  { href: "/reports", label: "Reports", Icon: IconReports },
  { href: "/vault", label: "Vault", Icon: IconVault },
] as const;

function RailLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link href={href} title={label} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
      <Icon className="nav-ico" />
      <span className="sr-only">{label}</span>
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
  const [orgLive, setOrgLive] = useState("");
  const [wake, setWake] = useState<"loading" | "slow" | "error">("loading");
  const [wakeErr, setWakeErr] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [orgOpen, setOrgOpen] = useState(false);

  const alive = useRef(true);

  function loadSession() {
    setWakeErr("");
    setRetrying(true);
    Promise.all([
      api<Me>("/api/me"),
      api<{ orgs: { id: string; name: string; fixtureOnly?: boolean }[] }>("/api/orgs").catch(() => ({
        orgs: [],
      })),
    ])
      .then(([m, o]) => {
        if (!alive.current) return;
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
      .catch((e: unknown) => {
        if (!alive.current) return;
        const msg = e instanceof Error ? e.message : UPSTREAM_UNAVAILABLE_MESSAGE;
        if (isWakeError(msg)) {
          setWake("error");
          setWakeErr(msg);
          return;
        }
        router.replace(`/login?next=${encodeURIComponent(pathRef.current)}`);
      })
      .finally(() => {
        if (alive.current) setRetrying(false);
      });
  }

  useEffect(() => {
    alive.current = true;
    const slow = window.setTimeout(() => {
      setWake((w) => (w === "loading" ? "slow" : w));
    }, 2500);
    loadSession();
    return () => {
      alive.current = false;
      window.clearTimeout(slow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQ.trim();
    if (!q) return;
    router.push(`/companies?q=${encodeURIComponent(q)}`);
  }

  const fixture =
    Boolean(me?.org?.metadata?.includes("fixtureOnly")) || /FIXTURE_ONLY/i.test(me?.org?.name ?? "");
  const canWrite = isWriteRole(me?.role);
  const initial = (me?.user?.name?.trim()[0] || "?").toUpperCase();

  if (!ready) {
    const message =
      wake === "error" ? WAKING_COPY.unreachable : wake === "slow" ? WAKING_COPY.slow : WAKING_COPY.checking;
    return (
      <WakingBook
        message={message}
        detail={wake === "error" && wakeErr && wakeErr !== WAKING_COPY.unreachable ? wakeErr : undefined}
        onRetry={wake === "error" ? loadSession : undefined}
        busy={wake !== "error" || retrying}
      />
    );
  }

  return (
    <div className="app" data-testid="shell-ready">
      <a href="#main" className="skip-link">Skip to book</a>
      <aside className="rail" aria-label="Primary navigation">
        <Link href="/command" className="rail-brand" title="Venture OS">V</Link>
        <nav className="nav" aria-label="Rituals">
          {NAV.map((n) => (
            <RailLink
              key={n.href}
              href={n.href}
              label={n.label}
              Icon={n.Icon}
              active={path.startsWith(n.href)}
            />
          ))}
        </nav>
        <div className="rail-spacer" />
        <div className="rail-foot">
          <Link href="/settings" title="Settings" className={path.startsWith("/settings") ? "active" : ""}>
            <IconSettings className="nav-ico" />
          </Link>
          <button type="button" title="Account" onClick={() => setOrgOpen((v) => !v)} aria-expanded={orgOpen}>
            <span className="rail-avatar">{initial}</span>
          </button>
          {orgOpen ? (
            <div className="org-menu" style={{ position: "fixed", bottom: 72, left: 56 }}>
              {orgs.length > 1 ? (
                <select
                  value={me?.org?.id ?? ""}
                  onChange={(e) => switchOrg(e.target.value)}
                  aria-label="Organisation"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              ) : (
                <div className="who">{me?.org?.name}</div>
              )}
              <div className="who-meta">{roleLabel(me?.role)}</div>
              <button className="btn ghost sm" type="button" onClick={signOut} style={{ width: "100%", marginTop: 8 }}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <span className="topbar-title">Venture OS</span>
          <form className="topbar-search" onSubmit={onSearch} role="search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="Search companies, flags, or reports…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              aria-label="Search"
            />
          </form>
          <div className="topbar-actions">
            <Link href="/security" className="topbar-icon" title="Methodology">
              <HelpCircle size={18} />
            </Link>
            {canWrite ? (
              <Link href="/companies/new" className="btn sm">Create</Link>
            ) : null}
          </div>
        </header>
        <main className="main" id="main">
          {fixture && (
            <div className="banner" role="alert">
              FIXTURE_ONLY — illustrative rows. Not the live V3 book. Do not report these figures.
            </div>
          )}
          <Pipeline
            current={
              path.startsWith("/inbox")
                ? "proposed"
                : path.startsWith("/vault") || path.startsWith("/companies/new")
                  ? "source"
                  : path.startsWith("/flags")
                    ? "reviewed"
                    : path.startsWith("/ask") || path.startsWith("/reports") || path.startsWith("/compare")
                      ? "analysis"
                      : "book"
            }
          />
          <div className="sr-only" aria-live="polite">{orgLive}</div>
          <BookSessionContext.Provider
            value={{
              me,
              canWrite,
              isAdmin: isAdminRole(me?.role),
              canLock: isLockRole(me?.role),
              ready: true,
            }}
          >
            <CiteProvider>{children}</CiteProvider>
          </BookSessionContext.Provider>
        </main>
      </div>
    </div>
  );
}

export function Fact({
  display,
  isFact,
  sourcePath,
  note,
  cite,
}: {
  display: string;
  isFact: boolean;
  sourcePath?: string;
  note?: string | null;
  cite?: CitePayload;
}) {
  const openCite = useCite();
  const payload: CitePayload | undefined =
    cite || sourcePath ? { ...cite, display, sourcePath: cite?.sourcePath ?? sourcePath } : undefined;
  const open = payload ? () => openCite(payload) : undefined;
  const value = !isFact ? (
    <span className="chip unfact">—</span>
  ) : open ? (
    <button type="button" className="chip" title="Open citation" aria-label={`${display} — open citation`} onClick={open}>
      {display}
    </button>
  ) : (
    <span className="chip">{display}</span>
  );
  return (
    <span className="fact">
      {value}
      {isFact && open ? (
        <button type="button" className="cite" onClick={open} aria-label="Open citation">
          Cite
        </button>
      ) : null}
      {note ? (
        <span className="lede" style={{ display: "block", width: "100%", marginTop: 2 }}>
          {note}
        </span>
      ) : null}
    </span>
  );
}
