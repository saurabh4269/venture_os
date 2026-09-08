"use client";

import { CiteProvider, useCite, type CitePayload } from "@/components/Cite";
import { SettingsSubnav } from "@/components/BookUI";
import {
  IconAsk,
  IconCommand,
  IconCompanies,
  IconCompare,
  IconFlags,
  IconInbox,
  IconNav,
  IconOrg,
  IconRailLeft,
  IconRailRight,
  IconReports,
  IconSettings,
  IconUser,
  IconVault,
} from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WakingBook } from "@/components/WakingBook";
import { api, UPSTREAM_UNAVAILABLE_MESSAGE } from "@/lib/api";
import { authClient, type Me } from "@/lib/auth-client";
import { BOOK_KEEPALIVE_MS, bookFetcher, bookSwrOptions, prefetchBookApis } from "@/lib/book-data";
import { SPRING_INDICATOR } from "@/lib/motion-ease";
import { isAdminRole, isLockRole, isWriteRole, roleLabel } from "@/lib/roles";
import { isWakeError, nextWakeDelayMs, pingBookHealth, WAKE_AUTO_RETRY, WAKING_COPY } from "@/lib/wake";
import { Suspense } from "react";
import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import useSWR, { mutate as swrMutate } from "swr";

type PulseLite = { pulse: { inboxPending: number; openFlags: number } };

type BookSession = { me: Me | null; canWrite: boolean; isAdmin: boolean; canLock: boolean; ready: boolean };
const BookSessionContext = createContext<BookSession>({
  me: null,
  canWrite: false,
  isAdmin: false,
  canLock: false,
  ready: false,
});

/** Prefer Shell context (shared layout). Falls back to a cached /api/me read. */
export function useBookSession(): BookSession {
  const ctx = useContext(BookSessionContext);
  const { data: me, isLoading } = useSWR<Me>(ctx.me ? null : "/api/me", bookFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  const role = ctx.me?.role ?? me?.role ?? null;
  return {
    me: ctx.me ?? me ?? null,
    canWrite: isWriteRole(role),
    isAdmin: isAdminRole(role),
    canLock: isLockRole(role),
    ready: ctx.ready || Boolean(ctx.me) || Boolean(me) || !isLoading,
  };
}

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
};

type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    id: "today",
    title: "Today",
    items: [{ href: "/command", label: "Command", Icon: IconCommand }],
  },
  {
    id: "book",
    title: "Book",
    items: [
      {
        href: "/companies",
        label: "Companies",
        Icon: IconCompanies,
        match: (p) => p === "/companies" || p.startsWith("/companies/"),
      },
      { href: "/confirm", label: "Confirm", Icon: IconInbox, match: (p) => p.startsWith("/confirm") || p.startsWith("/inbox") },
      { href: "/sources", label: "Sources", Icon: IconVault, match: (p) => p.startsWith("/sources") || p.startsWith("/vault") },
    ],
  },
  {
    id: "review",
    title: "Review",
    items: [
      { href: "/flags", label: "Flags", Icon: IconFlags },
      { href: "/nav", label: "NAV", Icon: IconNav },
      { href: "/compare", label: "Compare", Icon: IconCompare },
    ],
  },
  {
    id: "output",
    title: "Output",
    items: [
      { href: "/reports", label: "Reports", Icon: IconReports },
      { href: "/ask", label: "Ask", Icon: IconAsk, match: (p) => p.startsWith("/ask") },
    ],
  },
  {
    id: "firm",
    title: "Firm",
    items: [
      {
        href: "/settings",
        label: "Settings",
        Icon: IconSettings,
        match: (p) => p.startsWith("/settings"),
      },
    ],
  },
];

const RAIL_COLLAPSED_KEY = "vos.railCollapsed";

function pathActive(path: string, item: NavItem) {
  if (item.match) return item.match(path);
  return path === item.href || path.startsWith(`${item.href}/`);
}

function NavLink({
  href,
  label,
  Icon,
  active,
  onClick,
  nested,
  badge,
  collapsed,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  nested?: boolean;
  badge?: number | null;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const showBadge = badge != null && badge > 0;
  return (
    <Link
      href={href}
      className={`${nested ? "nav-sub" : ""}${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label={showBadge ? `${label}, ${badge}` : label}
      title={collapsed ? label : undefined}
      onClick={onClick}
      onMouseEnter={() => {
        router.prefetch(href);
        prefetchBookApis(href);
      }}
      onFocus={() => {
        router.prefetch(href);
        prefetchBookApis(href);
      }}
    >
      {active ? (
        <motion.span
          layoutId="rail-active"
          className="nav-active-pill"
          transition={reduce ? { duration: 0 } : SPRING_INDICATOR}
        />
      ) : null}
      <Icon className="nav-ico" />
      <span className="nav-label">{label}</span>
      {showBadge ? (
        <span className="nav-badge" aria-hidden>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

type OrgRow = { id: string; name: string; fixtureOnly?: boolean };

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [orgLive, setOrgLive] = useState("");
  const [wake, setWake] = useState<"loading" | "slow" | "error">("loading");
  const [wakeErr, setWakeErr] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [wakeEpoch, setWakeEpoch] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    try {
      setRailCollapsed(window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setNavOpen(false);
    setAccountOpen(false);
  }, [path]);

  function toggleRailCollapsed() {
    setRailCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const {
    data: me,
    error: meError,
    isLoading: meLoading,
    isValidating: meValidating,
    mutate: mutateMe,
  } = useSWR<Me>("/api/me", bookFetcher, {
    dedupingInterval: 30_000,
    revalidateOnFocus: true,
    /** Shell owns cold-start retries so we can ping /api/health between attempts. */
    shouldRetryOnError: false,
  });
  const { data: orgsData, mutate: mutateOrgs } = useSWR<{ orgs: OrgRow[] }>(
    me?.user ? "/api/orgs" : null,
    bookFetcher,
    { dedupingInterval: 30_000, revalidateOnFocus: false },
  );
  const orgs = orgsData?.orgs ?? [];
  const ready = Boolean(me?.user && me.orgId && !me.needsOrg);
  const sessionPending = meLoading && !me;
  const { data: pulseLite } = useSWR<PulseLite>(ready ? "/api/command" : null, bookFetcher, {
    ...bookSwrOptions,
    dedupingInterval: 15_000,
  });
  const confirmBadge = pulseLite?.pulse.inboxPending ?? null;
  const flagsBadge = pulseLite?.pulse.openFlags ?? null;

  /** Start waking the free-tier API as soon as a book route mounts. */
  useEffect(() => {
    void pingBookHealth();
  }, []);

  /**
   * Cookie-only gate: if there is no session cookie, send to login with `next=`
   * without waiting on a cold API (unlike /api/me).
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/session-hint", { credentials: "include", cache: "no-store" });
        const hint = (await res.json().catch(() => null)) as { hasSession?: boolean } | null;
        if (cancelled || redirected.current || hint?.hasSession !== false) return;
        redirected.current = true;
        router.replace(`/login?next=${encodeURIComponent(pathRef.current)}`);
      } catch {
        /* hint is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!sessionPending) return;
    const slow = window.setTimeout(() => setWake((w) => (w === "loading" ? "slow" : w)), 2500);
    return () => window.clearTimeout(slow);
  }, [sessionPending]);

  /**
   * Cold API: stay on this tab, ping health, and re-fetch /api/me with backoff.
   * Real auth failures still go to /login?next=… (session preserved in the URL).
   */
  useEffect(() => {
    if (ready || !meError || redirected.current) return;
    const msg = meError instanceof Error ? meError.message : UPSTREAM_UNAVAILABLE_MESSAGE;
    if (!isWakeError(msg)) {
      if (redirected.current) return;
      redirected.current = true;
      router.replace(`/login?next=${encodeURIComponent(pathRef.current)}`);
      return;
    }

    let cancelled = false;
    setWake("slow");
    setWakeErr(msg);

    void (async () => {
      for (let attempt = 0; attempt < WAKE_AUTO_RETRY.maxAttempts; attempt++) {
        if (cancelled || redirected.current) return;
        void pingBookHealth();
        const delay = attempt === 0 ? WAKE_AUTO_RETRY.firstDelayMs : nextWakeDelayMs(attempt - 1);
        await new Promise((r) => window.setTimeout(r, delay));
        if (cancelled || redirected.current) return;
        setRetrying(true);
        try {
          const data = await mutateMe();
          if (cancelled || redirected.current) return;
          if (data?.user) {
            setWakeErr("");
            setWake("loading");
            return;
          }
          if (data && !data.user) return;
        } catch {
          /* keep auto-waking */
        } finally {
          if (!cancelled) setRetrying(false);
        }
      }
      if (!cancelled && !redirected.current) setWake("error");
    })();

    const onVis = () => {
      if (document.visibilityState !== "visible" || cancelled || redirected.current) return;
      void pingBookHealth();
      void mutateMe();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [meError, ready, mutateMe, router, wakeEpoch]);

  useEffect(() => {
    if (!me || redirected.current) return;
    if (!me.user) {
      redirected.current = true;
      router.replace(`/login?next=${encodeURIComponent(pathRef.current)}`);
      return;
    }
    if (me.needsOrg || !me.orgId) {
      redirected.current = true;
      router.replace("/onboard");
    }
  }, [me, router]);

  /** Keep free-tier API warm while the book tab stays open. */
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const ping = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      void pingBookHealth();
    };
    ping();
    const id = window.setInterval(ping, BOOK_KEEPALIVE_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready]);

  async function loadSession() {
    setWakeErr("");
    setWake("slow");
    setRetrying(false);
    redirected.current = false;
    /** Bump epoch so the auto-wake effect restarts even if meError is unchanged. */
    setWakeEpoch((n) => n + 1);
    void pingBookHealth();
  }

  async function switchOrg(id: string) {
    if (!id || id === me?.org?.id) return;
    try {
      await api("/api/orgs/select", { method: "POST", body: JSON.stringify({ organizationId: id }) });
      await Promise.all([mutateMe(), mutateOrgs()]);
      await swrMutate(() => true, undefined, { revalidate: true });
      setOrgLive(me?.org?.name ?? "");
      setAccountOpen(false);
      router.refresh();
    } catch {
      setOrgLive("Could not switch organisation");
    }
  }

  async function signOut() {
    redirected.current = true;
    try {
      await api("/api/logout", { method: "POST", body: "{}" });
    } catch {
      await authClient.signOut();
    }
    await swrMutate(() => true, undefined, { revalidate: false });
    router.push("/login");
  }

  const fixture =
    Boolean(me?.org?.metadata?.includes("fixtureOnly")) || /FIXTURE_ONLY/i.test(me?.org?.name ?? "");
  const canWrite = isWriteRole(me?.role);
  const orgName = me?.org?.name ?? "Venture OS";
  const isSettings = path.startsWith("/settings");
  if (!ready) {
    const message =
      wake === "error" ? WAKING_COPY.unreachable : wake === "slow" || meValidating ? WAKING_COPY.slow : WAKING_COPY.checking;
    return (
      <WakingBook
        message={message}
        detail={wake === "error" && wakeErr && wakeErr !== WAKING_COPY.unreachable ? wakeErr : undefined}
        onRetry={wake === "error" ? loadSession : undefined}
        busy={wake !== "error" || retrying}
      />
    );
  }

  const session = (
    <BookSessionContext.Provider
      value={{
        me: me ?? null,
        canWrite,
        isAdmin: isAdminRole(me?.role),
        canLock: isLockRole(me?.role),
        ready: true,
      }}
    >
      <CiteProvider>{children}</CiteProvider>
    </BookSessionContext.Provider>
  );

  const accountMenu = (
    <div className="account" aria-label="Account">
      <button
        type="button"
        className="account-trigger"
        aria-expanded={accountOpen}
        aria-controls="account-menu"
        data-testid="account-menu"
        title={me?.user?.name ?? "Account"}
        onClick={() => setAccountOpen((v) => !v)}
      >
        <IconUser />
        <span className="account-who">
          <span className="who">{me?.user?.name}</span>
          <span className="who-meta">{roleLabel(me?.role)}</span>
        </span>
      </button>
      {accountOpen ? (
        <div id="account-menu" className="account-menu" role="menu">
          {!isSettings ? (
            <Link
              href="/settings"
              role="menuitem"
              className="account-menu-item"
              onClick={() => {
                setAccountOpen(false);
                setNavOpen(false);
              }}
            >
              <IconSettings className="nav-ico" />
              Settings
            </Link>
          ) : null}
          {orgs.length === 0 ? (
            <Link href="/onboard" role="menuitem" className="account-menu-item" onClick={() => setAccountOpen(false)}>
              <IconOrg className="nav-ico" />
              Create organisation
            </Link>
          ) : (
            <label className="account-menu-item account-org">
              <IconOrg className="nav-ico" />
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
          <ThemeToggle variant="menu" />
          <button type="button" className="account-menu-item" role="menuitem" onClick={signOut}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );

  if (isSettings) {
    return (
      <div className="app app-settings" data-testid="shell-ready">
        <a href="#main" className="skip-link">
          Skip to settings
        </a>
        <header className="settings-topbar">
          <Link href="/command" className="settings-back">
            ← Book
          </Link>
          <div className="settings-topbar-brand">
            <span className="settings-topbar-title">Settings</span>
            <span className="settings-topbar-org">{orgName}</span>
          </div>
          <button
            type="button"
            className="settings-nav-toggle"
            aria-expanded={navOpen}
            aria-controls="settings-nav"
            onClick={() => setNavOpen((v) => !v)}
          >
            Sections
          </button>
          <ThemeToggle />
          {accountMenu}
        </header>
        <div className="settings-shell">
          <aside className={`settings-rail${navOpen ? " is-open" : ""}`} id="settings-nav">
            <Suspense fallback={<nav className="settings-subnav" aria-hidden />}>
              <SettingsSubnav />
            </Suspense>
          </aside>
          <main className="main" id="main">
            {fixture && (
              <div className="banner" role="alert">
                FIXTURE_ONLY. Illustrative rows. Not production figures.
              </div>
            )}
            <div className="sr-only" aria-live="polite">
              {orgLive}
            </div>
            {session}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`app${railCollapsed ? " rail-collapsed" : ""}`} data-testid="shell-ready">
      <a href="#main" className="skip-link">
        Skip to book
      </a>
      <aside className={`rail${navOpen ? " is-open" : ""}${railCollapsed ? " is-collapsed" : ""}`}>
        <div className="rail-top">
          <Link href="/command" className="brand" title="Venture OS">
            <span className="brand-mark" aria-hidden>
              V
            </span>
            <span className="brand-copy">
              Venture OS
              <span>{orgName}</span>
            </span>
          </Link>
          <button
            type="button"
            className="rail-collapse"
            aria-pressed={railCollapsed}
            aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleRailCollapsed}
          >
            {railCollapsed ? <IconRailRight /> : <IconRailLeft />}
          </button>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={navOpen}
            aria-controls="primary-nav"
            onClick={() => setNavOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
        <nav id="primary-nav" className={navOpen ? "nav is-open" : "nav"} aria-label="Primary">
          {NAV.map((g) => (
            <div key={g.id} className="nav-group">
              <div className="nav-sec">{g.title}</div>
              {g.items.map((n) => (
                <NavLink
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  Icon={n.Icon}
                  nested
                  collapsed={railCollapsed}
                  active={pathActive(path, n)}
                  onClick={() => setNavOpen(false)}
                  badge={n.href === "/confirm" ? confirmBadge : n.href === "/flags" ? flagsBadge : null}
                />
              ))}
            </div>
          ))}
        </nav>
        {canWrite && (
          <Link
            href="/companies/new"
            className="btn rail-cta"
            title="New company"
            onClick={() => setNavOpen(false)}
          >
            <span className="rail-cta-label">New company</span>
            <span className="rail-cta-plus" aria-hidden>
              +
            </span>
          </Link>
        )}
        {accountMenu}
      </aside>
      <main className="main" id="main">
        {fixture && (
          <div className="banner" role="alert">
            FIXTURE_ONLY. Illustrative rows. Not production figures.
          </div>
        )}
        <div className="sr-only" aria-live="polite">
          {orgLive}
        </div>
        {session}
      </main>
    </div>
  );
}

export function Fact({
  display,
  isFact,
  sourcePath,
  documentId,
  note,
  cite,
}: {
  display: string;
  isFact: boolean;
  sourcePath?: string;
  documentId?: string;
  note?: string | null;
  cite?: CitePayload;
}) {
  const openCite = useCite();
  const payload: CitePayload | undefined =
    cite || sourcePath || documentId
      ? {
          ...cite,
          display,
          sourcePath: cite?.sourcePath ?? sourcePath,
          documentId: cite?.documentId ?? documentId,
        }
      : undefined;
  const open = payload ? () => openCite(payload) : undefined;
  const tip = note?.trim() && !/^EUR\s*[—-]/.test(note.trim()) && !/no FX triple/i.test(note) ? note.trim() : undefined;
  const value = !isFact ? (
    <span className="fact-miss" aria-label="Not reported" />
  ) : open ? (
    <button
      type="button"
      className="fact-cite"
      title={tip ?? "Open source"}
      aria-label={`Open source for ${display}`}
      onClick={open}
    >
      {display}
    </button>
  ) : (
    <span className="fact-value" title={tip}>
      {display}
    </span>
  );
  return <span className="fact">{value}</span>;
}
