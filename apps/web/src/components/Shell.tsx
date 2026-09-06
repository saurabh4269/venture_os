"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Inbox,
  Flag,
  Building2,
  MessageCircleQuestion,
  TrendingUp,
  BarChart3,
  FileText,
  Vault,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { authClient, type Me } from "@/lib/auth-client";
import { isAdminRole, isLockRole, isWriteRole, roleLabel } from "@/lib/roles";
import { CiteProvider, useCite, type CitePayload } from "@/components/Cite";
import { WakingBook } from "@/components/WakingBook";
import { UPSTREAM_UNAVAILABLE_MESSAGE } from "@/lib/api";
import { isWakeError, WAKING_COPY } from "@/lib/wake";

const RAIL_STORAGE_KEY = "vos.railExpanded";

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

const NAV_PRIMARY = [
  { href: "/command", label: "Command", Icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", Icon: Inbox },
  { href: "/flags", label: "Flags", Icon: Flag },
  { href: "/companies", label: "Companies", Icon: Building2 },
] as const;

const NAV_SECONDARY = [
  { href: "/ask", label: "Ask", Icon: MessageCircleQuestion },
  { href: "/nav", label: "NAV", Icon: TrendingUp },
  { href: "/compare", label: "Compare", Icon: BarChart3 },
  { href: "/reports", label: "Reports", Icon: FileText },
  { href: "/vault", label: "Vault", Icon: Vault },
] as const;

const NAV = [...NAV_PRIMARY, ...NAV_SECONDARY];

type NavItem = (typeof NAV_PRIMARY)[number] | (typeof NAV_SECONDARY)[number];

function mobileNavTitle(path: string) {
  const items = [...NAV, { href: "/settings", label: "Settings" }];
  const hit = items.find((n) => path === n.href || path.startsWith(`${n.href}/`));
  return hit?.label ?? "Venture OS";
}

function useRailExpanded() {
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setExpanded(localStorage.getItem(RAIL_STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function toggle() {
    setExpanded((v) => {
      const next = !v;
      try {
        localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return { expanded, toggle, ready };
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { expanded: railExpanded, toggle: toggleRail, ready: railReady } = useRailExpanded();
  const topbarTitle = useMemo(() => mobileNavTitle(path), [path]);

  const alive = useRef(true);

  function loadSession() {
    setWakeErr("");
    setRetrying(true);
    Promise.all([
      api<Me>("/api/me"),
      api<{ orgs: { id: string; name: string; fixtureOnly?: boolean }[] }>("/api/orgs").catch(() => ({ orgs: [] })),
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
    const slow = window.setTimeout(() => setWake((w) => (w === "loading" ? "slow" : w)), 2500);
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
        api<{ orgs: { id: string; name: string; fixtureOnly?: boolean }[] }>("/api/orgs").catch(() => ({ orgs: [] })),
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
    if (q) router.push(`/companies?q=${encodeURIComponent(q)}`);
  }

  const fixture = Boolean(me?.org?.metadata?.includes("fixtureOnly"));
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

  function mobileNavLink(n: NavItem, secondary = false) {
    const active = path.startsWith(n.href);
    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={() => setMobileNavOpen(false)}
        className={`mobile-nav-link${secondary ? " mobile-nav-secondary" : ""}${active ? " active" : ""}`}
        aria-current={active ? "page" : undefined}
        data-testid={`mobile-nav-${n.label.toLowerCase()}`}
      >
        <n.Icon className="size-4 shrink-0" aria-hidden />
        {n.label}
      </Link>
    );
  }

  const railOpen = railReady && railExpanded;

  function railItem(n: NavItem, secondary = false) {
    const active = path.startsWith(n.href);
    const link = (
      <Link
        href={n.href}
        className={`rail-item ${secondary ? "rail-secondary" : ""} ${active ? "active" : ""}`}
        aria-current={active ? "page" : undefined}
        aria-label={n.label}
      >
        <n.Icon className="size-[18px] shrink-0" aria-hidden />
        {railOpen ? <span className="rail-label">{n.label}</span> : <span className="sr-only">{n.label}</span>}
      </Link>
    );

    if (railOpen) return <Fragment key={n.href}>{link}</Fragment>;

    return (
      <Tooltip key={n.href}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{n.label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={`app ${railOpen ? "app-rail-expanded" : ""}`} data-testid="shell-ready">
      <a href="#main" className="skip-link">Skip to book</a>
      <aside
        className={`rail hidden md:flex ${railOpen ? "rail-expanded" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="rail-head">
          <Link href="/command" className="rail-brand" title="Venture OS">V</Link>
          {railOpen ? <span className="rail-wordmark">Venture OS</span> : null}
          <button
            type="button"
            className="rail-toggle"
            data-testid="rail-toggle"
            onClick={toggleRail}
            aria-label={railOpen ? "Collapse navigation" : "Expand navigation"}
            aria-expanded={railOpen}
          >
            {railOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </div>
        <nav className="nav">
          {NAV_PRIMARY.map((n) => railItem(n))}
          <div className="rail-divider" aria-hidden />
          {railOpen ? (
            NAV_SECONDARY.map((n) => railItem(n, true))
          ) : (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="rail-item rail-secondary" aria-label="More navigation">
                      <MoreHorizontal className="size-[18px]" aria-hidden />
                      <span className="sr-only">More</span>
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">More</TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>More</DropdownMenuLabel>
                {NAV_SECONDARY.map((n) => (
                  <DropdownMenuItem key={n.href} onClick={() => router.push(n.href)}>
                    {n.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
        <div className="rail-spacer" />
        <div className="rail-foot">
          {railOpen ? (
            <Link
              href="/settings"
              className={`rail-item ${path.startsWith("/settings") ? "active" : ""}`}
              aria-label="Settings"
              aria-current={path.startsWith("/settings") ? "page" : undefined}
            >
              <Settings className="size-[18px]" aria-hidden />
              <span className="rail-label">Settings</span>
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className={`rail-item ${path.startsWith("/settings") ? "active" : ""}`}
                  aria-label="Settings"
                  aria-current={path.startsWith("/settings") ? "page" : undefined}
                >
                  <Settings className="size-[18px]" aria-hidden />
                  <span className="sr-only">Settings</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rail-item rail-account" aria-label="Account" data-testid="account-menu">
                <span className="rail-avatar">{initial}</span>
                {railOpen ? <span className="rail-label">{me?.user?.name ?? "Account"}</span> : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56" data-testid="account-dropdown">
              <DropdownMenuLabel>
                <div className="who">{me?.user?.name}</div>
                <div className="who-meta text-xs text-muted-foreground">{roleLabel(me?.role)}</div>
              </DropdownMenuLabel>
              {orgs.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  {orgs.map((o) => (
                    <DropdownMenuItem key={o.id} onClick={() => switchOrg(o.id)}>
                      {o.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} data-testid="sign-out">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <div className="topbar-leading">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open menu"
                data-testid="mobile-nav-open"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="mobile-sheet p-0" data-testid="mobile-nav">
              <SheetHeader className="mobile-sheet-head">
                <SheetTitle>Venture OS</SheetTitle>
                {me?.org?.name ? <p className="mobile-sheet-org">{me.org.name}</p> : null}
              </SheetHeader>
              <nav className="mobile-nav" aria-label="Mobile navigation">
                {NAV_PRIMARY.map((n) => mobileNavLink(n))}
                <Separator className="my-2" />
                <p className="mobile-nav-label">More</p>
                {NAV_SECONDARY.map((n) => mobileNavLink(n, true))}
              </nav>
              <div className="mobile-sheet-foot">
                <Link
                  href="/settings"
                  onClick={() => setMobileNavOpen(false)}
                  className={`mobile-nav-link${path.startsWith("/settings") ? " active" : ""}`}
                >
                  <Settings className="size-4 shrink-0" aria-hidden />
                  Settings
                </Link>
                <button
                  type="button"
                  className="mobile-nav-link mobile-nav-signout"
                  onClick={() => {
                    setMobileNavOpen(false);
                    void signOut();
                  }}
                  data-testid="mobile-sign-out"
                >
                  Sign out
                </button>
              </div>
            </SheetContent>
          </Sheet>
          <span className="topbar-title md:hidden" data-testid="topbar-mobile-title">{topbarTitle}</span>
          </div>
          <form className="topbar-search" onSubmit={onSearch} role="search">
            <Search className="size-4" aria-hidden />
            <input
              type="search"
              placeholder="Search companies, flags, or reports…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="topbar-search-input"
              aria-label="Search"
            />
          </form>
          <div className="topbar-actions">
            {canWrite && !path.startsWith("/companies/new") ? (
              <Link href="/companies/new" className="btn sm topbar-add-btn" aria-label="Add company">
                <span className="topbar-add-full">Add company</span>
                <span className="topbar-add-short" aria-hidden="true">Add</span>
              </Link>
            ) : null}
          </div>
        </header>
        <main className="main" id="main">
          {fixture && (
            <div className="banner" role="status">
              Demo data for testing. Upload your own files for real portfolio work.
            </div>
          )}
          <div className="sr-only" aria-live="polite">{orgLive}</div>
          <BookSessionContext.Provider
            value={{ me, canWrite, isAdmin: isAdminRole(me?.role), canLock: isLockRole(me?.role), ready: true }}
          >
            <CiteProvider>
              <AnimatePresence mode="wait">
                <motion.div
                  key={path}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </CiteProvider>
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
        <button type="button" className="cite" onClick={open} aria-label="Open citation">Cite</button>
      ) : null}
      {note ? (
        <span className="lede block w-full mt-0.5">{note}</span>
      ) : null}
    </span>
  );
}
