"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from "react";
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
import { isAdminRole, isLockRole, isWriteRole, roleLabel } from "@/lib/roles";
import { isWakeError, WAKING_COPY } from "@/lib/wake";

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
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${nested ? "nav-sub" : ""}${active ? " active" : ""}`}
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
  const [wake, setWake] = useState<"loading" | "slow" | "error">("loading");
  const [wakeErr, setWakeErr] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const alive = useRef(true);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const g of NAV) next[g.id] = groupOpen(path, g);
    setExpanded((prev) => ({ ...prev, ...next }));
  }, [path]);

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
      setAccountOpen(false);
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

  const fixture =
    Boolean(me?.org?.metadata?.includes("fixtureOnly")) || /FIXTURE_ONLY/i.test(me?.org?.name ?? "");
  const canWrite = isWriteRole(me?.role);
  const orgName = me?.org?.name ?? "Venture OS";
  const companyMatch = path.match(/^\/companies\/([^/]+)/);
  const askCompanyId = companyMatch && companyMatch[1] !== "new" ? companyMatch[1] : undefined;

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
            me,
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
