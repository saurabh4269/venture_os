"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from "react";
import { motion, useReducedMotion } from "motion/react";
import useSWR, { mutate as swrMutate } from "swr";
import { AskFab } from "@/components/AskPanel";
import { CiteProvider, useCite, type CitePayload } from "@/components/Cite";
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
import { WakingBook } from "@/components/WakingBook";
import { api, UPSTREAM_UNAVAILABLE_MESSAGE } from "@/lib/api";
import { authClient, type Me } from "@/lib/auth-client";
import { BOOK_KEEPALIVE_MS, bookFetcher, bookSwrOptions, prefetchBookApis } from "@/lib/book-data";
import { SPRING_INDICATOR } from "@/lib/motion-ease";
import { isAdminRole, isLockRole, isWriteRole, roleLabel } from "@/lib/roles";
import { isWakeError, WAKING_COPY } from "@/lib/wake";

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
    items: [{ href: "/reports", label: "Reports", Icon: IconReports }],
  },
];

function pathActive(path: string, item: NavItem) {
  if (item.match) return item.match(path);
  return path === item.href || path.startsWith(`${item.href}/`);
}

function groupOpen(path: string, group: NavGroup) {
  return group.items.some((item) => pathActive(path, item));
}

function NavLink({
  href,
  label,
  Icon,
  active,
  onClick,
  nested,
  badge,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  nested?: boolean;
  badge?: number | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const showBadge = badge != null && badge > 0;
  return (
    <Link
      href={href}
      className={`${nested ? "nav-sub" : ""}${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label={showBadge ? `${label}, ${badge}` : undefined}
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
  const [orgLive, setOrgLive] = useState("");
  const [wake, setWake] = useState<"loading" | "slow" | "error">("loading");
  const [wakeErr, setWakeErr] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const redirected = useRef(false);

  const {
    data: me,
    error: meError,
    isLoading: meLoading,
    isValidating: meValidating,
    mutate: mutateMe,
  } = useSWR<Me>("/api/me", bookFetcher, { dedupingInterval: 30_000, revalidateOnFocus: true });
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

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const g of NAV) next[g.id] = groupOpen(path, g);
    setExpanded((prev) => ({ ...prev, ...next }));
  }, [path]);

  useEffect(() => {
    if (!sessionPending) return;
    const slow = window.setTimeout(() => setWake((w) => (w === "loading" ? "slow" : w)), 2500);
    return () => window.clearTimeout(slow);
  }, [sessionPending]);

  useEffect(() => {
    if (!meError) return;
    const msg = meError instanceof Error ? meError.message : UPSTREAM_UNAVAILABLE_MESSAGE;
    if (isWakeError(msg)) {
      setWake("error");
      setWakeErr(msg);
      return;
    }
    if (redirected.current) return;
    redirected.current = true;
    router.replace(`/login?next=${encodeURIComponent(pathRef.current)}`);
  }, [meError, router]);

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
      void fetch("/api/health", { credentials: "include", cache: "no-store" }).catch(() => undefined);
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
    setWake("loading");
    setRetrying(true);
    redirected.current = false;
    try {
      await mutateMe();
      await mutateOrgs();
      setWake("loading");
    } finally {
      setRetrying(false);
    }
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
  const companyMatch = path.match(/^\/companies\/([^/]+)/);
  const askCompanyId = companyMatch && companyMatch[1] !== "new" ? companyMatch[1] : undefined;

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

  return (
    <div className="app" data-testid="shell-ready">
      <a href="#main" className="skip-link">
        Skip to book
      </a>
      <aside className={navOpen ? "rail is-open" : "rail"}>
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
          {NAV.map((g) => {
            const open = expanded[g.id] ?? groupOpen(path, g);
            const single = g.items.length === 1;
            return (
              <div key={g.id} className="nav-group">
                {single ? (
                  <NavLink
                    href={g.items[0].href}
                    label={g.items[0].label}
                    Icon={g.items[0].Icon}
                    active={pathActive(path, g.items[0])}
                    onClick={() => setNavOpen(false)}
                    badge={
                      g.items[0].href === "/confirm"
                        ? confirmBadge
                        : g.items[0].href === "/flags"
                          ? flagsBadge
                          : null
                    }
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      className={`nav-parent${open ? " is-open" : ""}${groupOpen(path, g) ? " has-active" : ""}`}
                      aria-expanded={open}
                      onClick={() => setExpanded((e) => ({ ...e, [g.id]: !open }))}
                    >
                      <span>{g.title}</span>
                      <span className="nav-chevron" aria-hidden>
                        {open ? "▾" : "▸"}
                      </span>
                    </button>
                    {open
                      ? g.items.map((n) => (
                          <NavLink
                            key={n.href}
                            href={n.href}
                            label={n.label}
                            Icon={n.Icon}
                            nested
                            active={pathActive(path, n)}
                            onClick={() => setNavOpen(false)}
                            badge={
                              n.href === "/confirm" ? confirmBadge : n.href === "/flags" ? flagsBadge : null
                            }
                          />
                        ))
                      : null}
                  </>
                )}
              </div>
            );
          })}
        </nav>
        {canWrite && (
          <Link href="/companies/new" className="btn rail-cta" onClick={() => setNavOpen(false)}>
            New company
          </Link>
        )}
        <div className="account" aria-label="Account">
          <button
            type="button"
            className="account-trigger"
            aria-expanded={accountOpen}
            aria-controls="account-menu"
            data-testid="account-menu"
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
              <Link
                href="/ask"
                role="menuitem"
                className="account-menu-item"
                onClick={() => {
                  setAccountOpen(false);
                  setNavOpen(false);
                }}
              >
                <IconAsk className="nav-ico" />
                Ask history
              </Link>
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
              <button type="button" className="account-menu-item" role="menuitem" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
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
        <BookSessionContext.Provider
          value={{
            me: me ?? null,
            canWrite,
            isAdmin: isAdminRole(me?.role),
            canLock: isLockRole(me?.role),
            ready: true,
          }}
        >
          <CiteProvider>
            {children}
            <AskFab companyId={askCompanyId} />
          </CiteProvider>
        </BookSessionContext.Provider>
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
  const value = !isFact ? (
    <span className="chip unfact">—</span>
  ) : open ? (
    <button type="button" className="chip" title="Open citation" aria-label={`${display} citation`} onClick={open}>
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
