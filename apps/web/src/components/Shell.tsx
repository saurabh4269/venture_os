"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
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
  HelpCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Pipeline } from "@/components/BookUI";
import { CiteProvider, useCite, type CitePayload } from "@/components/Cite";
import { WakingBook } from "@/components/WakingBook";
import { UPSTREAM_UNAVAILABLE_MESSAGE } from "@/lib/api";
import { isWakeError, WAKING_COPY } from "@/lib/wake";

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
  { href: "/command", label: "Command", Icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", Icon: Inbox },
  { href: "/flags", label: "Flags", Icon: Flag },
  { href: "/companies", label: "Companies", Icon: Building2 },
  { href: "/ask", label: "Ask", Icon: MessageCircleQuestion },
  { href: "/nav", label: "NAV", Icon: TrendingUp },
  { href: "/compare", label: "Compare", Icon: BarChart3 },
  { href: "/reports", label: "Reports", Icon: FileText },
  { href: "/vault", label: "Vault", Icon: Vault },
] as const;

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

  const railLink = (n: (typeof NAV)[number]) => {
    const active = path.startsWith(n.href);
    return (
      <Tooltip key={n.href}>
        <TooltipTrigger asChild>
          <Link
            href={n.href}
            className={`grid size-10 place-items-center rounded-md transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            aria-current={active ? "page" : undefined}
          >
            <n.Icon className="size-[18px]" />
            <span className="sr-only">{n.label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{n.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="app" data-testid="shell-ready">
      <a href="#main" className="skip-link">Skip to book</a>
      <aside className="rail hidden md:flex" aria-label="Primary navigation">
        <Link href="/command" className="rail-brand" title="Venture OS">V</Link>
        <nav className="nav flex flex-col items-center gap-1">{NAV.map(railLink)}</nav>
        <div className="rail-spacer" />
        <div className="rail-foot">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/settings" className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted">
                <Settings className="size-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" title="Account" aria-label="Account" className="grid size-10 place-items-center rounded-md">
                <span className="rail-avatar">{initial}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
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
              <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="md:hidden" aria-label="Open navigation">
                <LayoutDashboard className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader><SheetTitle>Venture OS</SheetTitle></SheetHeader>
              <nav className="flex flex-col gap-1 mt-4">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted">
                    <n.Icon className="size-4" /> {n.label}
                  </Link>
                ))}
                <Separator className="my-2" />
                <Link href="/settings" className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted">
                  <Settings className="size-4" /> Settings
                </Link>
                <Button variant="ghost" className="justify-start" onClick={signOut}>Sign out</Button>
              </nav>
            </SheetContent>
          </Sheet>
          <span className="topbar-title hidden sm:inline">Venture OS</span>
          <form className="topbar-search" onSubmit={onSearch} role="search">
            <Search className="size-4" aria-hidden />
            <Input
              type="search"
              placeholder="Search companies, flags, or reports…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="rounded-full bg-muted/50 pl-9"
              aria-label="Search"
            />
          </form>
          <div className="topbar-actions">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link href="/security"><HelpCircle className="size-4" /></Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Methodology</TooltipContent>
            </Tooltip>
            {canWrite ? (
              <Button size="sm" asChild><Link href="/companies/new">Create</Link></Button>
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
              path.startsWith("/inbox") ? "proposed"
                : path.startsWith("/vault") || path.startsWith("/companies/new") ? "source"
                : path.startsWith("/flags") ? "reviewed"
                : path.startsWith("/ask") || path.startsWith("/reports") || path.startsWith("/compare") ? "analysis"
                : "book"
            }
          />
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
