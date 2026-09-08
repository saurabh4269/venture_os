"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  IconChevronDown,
  IconClose,
  IconConnectors,
  IconFirm,
  IconFlags,
  IconFormula,
  IconFunds,
  IconPeople,
  IconSearch,
} from "@/components/Icons";
import { companyLogoSrc } from "@/lib/company-logos";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatOwnership } from "@/lib/format";
import { SPRING_INDICATOR } from "@/lib/motion-ease";

export { formatOwnership };

export function PageHead({
  title,
  lede,
  kicker,
  actions,
  testId,
  badge,
  mark,
}: {
  title: string;
  lede?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  testId?: string;
  badge?: ReactNode;
  mark?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className={mark ? "page-head-main" : undefined}>
        {mark ? <div className="page-head-mark">{mark}</div> : null}
        <div>
          {kicker ? <p className="page-kicker">{kicker}</p> : null}
          <div className="page-title-row">
            <h1 data-testid={testId}>{title}</h1>
            {badge}
          </div>
          {lede ? <p className="lede">{lede}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

/** Primary visual + attention rail. Same fold on Command, NAV, company, Compare. */
export function WorkSplit({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`work-split${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function Panel({
  title,
  actions,
  children,
  flush,
  className,
  kicker,
  id,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
  kicker?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={`panel${className ? ` ${className}` : ""}`}>
      {(title || actions || kicker) && (
        <div className="panel-head">
          <div>
            {kicker ? <p className="page-kicker">{kicker}</p> : null}
            {title ? <h2>{title}</h2> : <span />}
          </div>
          {actions}
        </div>
      )}
      <div className={flush ? "panel-body flush" : "panel-body"}>{children}</div>
    </section>
  );
}

export type SettingsTab = "formula" | "flags" | "connectors" | "firm" | "funds" | "people";

export function settingsTabFromLocation(path: string, tabQuery: string | null): SettingsTab {
  if (path.startsWith("/settings/connectors")) return "connectors";
  if (tabQuery === "formula" || tabQuery === "flags" || tabQuery === "firm" || tabQuery === "funds" || tabQuery === "people") {
    return tabQuery;
  }
  return "formula";
}

export function SettingsSubnav({ current }: { current?: SettingsTab }) {
  const layoutId = useId();
  const reduce = useReducedMotion();
  const path = usePathname();
  const search = useSearchParams();
  const active = current ?? settingsTabFromLocation(path, search.get("tab"));
  const tabs: { id: SettingsTab; href: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [
    { id: "formula", href: "/settings?tab=formula", label: "Formula book", Icon: IconFormula },
    { id: "flags", href: "/settings?tab=flags", label: "Flag policy", Icon: IconFlags },
    { id: "connectors", href: "/settings/connectors", label: "Connectors", Icon: IconConnectors },
    { id: "firm", href: "/settings?tab=firm", label: "Firm", Icon: IconFirm },
    { id: "funds", href: "/settings?tab=funds", label: "Funds", Icon: IconFunds },
    { id: "people", href: "/settings?tab=people", label: "People", Icon: IconPeople },
  ];
  return (
    <nav className="settings-subnav" aria-label="Settings">
      {tabs.map((t) => {
        const on = active === t.id;
        const Icon = t.Icon;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={on ? "on" : undefined}
            aria-current={on ? "page" : undefined}
          >
            {on ? (
              <motion.span
                layoutId={`settings-tab-${layoutId}`}
                className="settings-tab-indicator"
                transition={reduce ? { duration: 0 } : SPRING_INDICATOR}
              />
            ) : null}
            <Icon className="nav-ico" />
            <span className="settings-tab-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function PageTabs({
  tabs,
  current,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  current: string;
  onChange: (id: string) => void;
}) {
  const layoutId = useId();
  const reduce = useReducedMotion();
  return (
    <div className="page-tabs" role="tablist">
      {tabs.map((t) => {
        const on = current === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            className={`page-tab${on ? " on" : ""}`}
            onClick={() => onChange(t.id)}
          >
            {on ? (
              <motion.span
                layoutId={`page-tab-${layoutId}`}
                className="page-tab-indicator"
                transition={reduce ? { duration: 0 } : SPRING_INDICATOR}
              />
            ) : null}
            <span className="page-tab-label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Status / kind chip row.
 * Structure from Beautiful UI filter tables; spring layoutId indicator from beUI Tabs
 * (gliding pill reads clearer than a hard color swap).
 */
export function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string; count?: string | number; testId?: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const layoutId = useId();
  const reduce = useReducedMotion();
  return (
    <div className="tabs filter-pills" role="group" aria-label={label}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            className={`filter-pill${on ? " on" : ""}`}
            data-testid={o.testId}
            aria-pressed={on}
            onClick={() => onChange(o.id)}
          >
            {on ? (
              <motion.span
                layoutId={`filter-pill-${layoutId}`}
                className="filter-pill-indicator"
                transition={reduce ? { duration: 0 } : SPRING_INDICATOR}
              />
            ) : null}
            <span className="filter-pill-label">
              {o.label}
              {o.count != null ? <span className="filter-count">{o.count}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Retrieved-knowledge style tile for Ask / cite excerpts. Click opens source when onOpen is set. */
export function ContextCard({
  kicker,
  body,
  action,
  onOpen,
}: {
  kicker?: ReactNode;
  body: ReactNode;
  action?: ReactNode;
  onOpen?: () => void;
}) {
  const inner = (
    <>
      {kicker ? <div className="context-card-kicker">{kicker}</div> : null}
      <div className="context-card-body">{body}</div>
      {action ? <div className="context-card-action">{action}</div> : null}
    </>
  );
  if (onOpen) {
    return (
      <button type="button" className="context-card context-card-btn" onClick={onOpen} aria-label="Open source">
        {inner}
      </button>
    );
  }
  return <div className="context-card">{inner}</div>;
}

/** @deprecated Prefer clickable Fact / ContextCard / cite-entry — kept for rare explicit actions. */
export function CiteChip({
  onOpen,
  label = "Cite",
}: {
  onOpen?: () => void;
  label?: string;
}) {
  if (!onOpen) return null;
  return (
    <button type="button" className="cite" onClick={onOpen} aria-label="Open citation">
      {label}
    </button>
  );
}

export function Pipeline({ current }: { current?: "source" | "proposed" | "reviewed" | "book" | "analysis" }) {
  const steps = [
    { key: "source", label: "Source" },
    { key: "proposed", label: "Proposed" },
    { key: "reviewed", label: "Reviewed" },
    { key: "book", label: "Book" },
    { key: "analysis", label: "Analysis" },
  ] as const;
  return (
    <p className="pipeline" aria-label="Book pipeline">
      {steps.map((s, i) => (
        <span key={s.key}>
          {i > 0 ? <span className="pipeline-rule" aria-hidden>→</span> : null}
          <span className={current === s.key ? "on" : undefined}>{s.label}</span>
        </span>
      ))}
    </p>
  );
}

/** Searchable company jump/filter — dropdown list for table toolbars and pickers. */
export function CompanyCombobox({
  companies,
  value,
  onChange,
  onPick,
  onClear,
  id = "co-search",
  placeholder = "Search companies…",
  emptyOption,
  limit = 12,
  label = "Search companies",
}: {
  companies: { id: string; name: string; stage?: string | null }[];
  value: string;
  onChange: (q: string) => void;
  onPick?: (company: { id: string; name: string }) => void;
  onClear?: () => void;
  id?: string;
  placeholder?: string;
  emptyOption?: string;
  limit?: number;
  label?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const matches = useMemo(() => {
    const needle = value.trim().toLowerCase();
    const list = !needle
      ? companies
      : companies.filter(
          (c) =>
            c.name.toLowerCase().includes(needle) ||
            (c.stage ?? "").toLowerCase().includes(needle),
        );
    return list.slice(0, limit);
  }, [companies, value, limit]);

  const showEmptyOption = Boolean(emptyOption) && !value.trim();
  const optionCount = matches.length + (showEmptyOption ? 1 : 0);

  useEffect(() => {
    setHi(0);
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(c: { id: string; name: string }) {
    onChange(c.name);
    setOpen(false);
    onPick?.(c);
  }

  function clear() {
    onChange("");
    setOpen(false);
    onClear?.();
  }

  return (
    <div className="company-combobox" ref={rootRef}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div className="company-combobox-field">
        <IconSearch className="company-combobox-ico" />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[hi] ? `${listId}-${matches[hi]!.id}` : undefined}
          className="company-combobox-input"
          placeholder={placeholder}
          value={value}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHi((i) => Math.min(i + 1, Math.max(optionCount - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHi((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              if (showEmptyOption && hi === 0) {
                clear();
                return;
              }
              const idx = showEmptyOption ? hi - 1 : hi;
              if (matches[idx]) pick(matches[idx]!);
            } else if (e.key === "Escape") {
              if (open) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }
            }
          }}
        />
        {value ? (
          <button
            type="button"
            className="company-combobox-clear"
            aria-label="Clear company"
            onClick={clear}
          >
            <IconClose />
          </button>
        ) : (
          <IconChevronDown className="company-combobox-chev" />
        )}
      </div>
      {open && (matches.length > 0 || showEmptyOption) ? (
        <ul id={listId} className="company-combobox-menu" role="listbox">
          {showEmptyOption ? (
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={hi === 0}
                className={`company-combobox-option${hi === 0 ? " is-on" : ""}`}
                onMouseEnter={() => setHi(0)}
                onClick={clear}
              >
                <span className="company-combobox-name">{emptyOption}</span>
              </button>
            </li>
          ) : null}
          {matches.map((c, i) => {
            const row = showEmptyOption ? i + 1 : i;
            return (
              <li key={c.id} role="presentation">
                <button
                  type="button"
                  id={`${listId}-${c.id}`}
                  role="option"
                  aria-selected={row === hi}
                  className={`company-combobox-option${row === hi ? " is-on" : ""}`}
                  onMouseEnter={() => setHi(row)}
                  onClick={() => pick(c)}
                >
                  <span className="company-combobox-lead">
                    <CompanyMark name={c.name} />
                    <span className="company-combobox-name">{c.name}</span>
                  </span>
                  <span className="company-combobox-meta">{c.stage ?? ""}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && value.trim() && matches.length === 0 ? (
        <div className="company-combobox-menu company-combobox-empty" role="status">
          No companies match
        </div>
      ) : null}
    </div>
  );
}

export function AuthFrame({
  children,
  tab,
}: {
  children: ReactNode;
  tab?: "signin" | "signup" | "other";
}) {
  const mode = tab ?? "other";
  return (
    <div className="auth-shell">
      <div className="auth-theme">
        <ThemeToggle />
      </div>
      <div className="auth-brand">
        {mode === "other" ? (
          <p className="wordmark">
            <Link href="/">Venture OS</Link>
          </p>
        ) : (
          <h1>
            <Link href="/">Venture OS</Link>
          </h1>
        )}
      </div>
      <div className="auth">
        {mode !== "other" && (
          <nav className="auth-tabs" aria-label="Account">
            <Link href="/login" className={mode === "signin" ? "on" : undefined} aria-current={mode === "signin" ? "page" : undefined}>
              Sign in
            </Link>
            <Link href="/signup" className={mode === "signup" ? "on" : undefined} aria-current={mode === "signup" ? "page" : undefined}>
              Create account
            </Link>
          </nav>
        )}
        {children}
      </div>
    </div>
  );
}

export const EM = "";

/** Invisible missing marker — prefer blank cells over dash placeholders. */
export function Miss({ label = "Not reported" }: { label?: string }) {
  return <span className="fact-miss" aria-label={label} />;
}

export function CompanyMark({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  const src = companyLogoSrc(name);
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(src) && !failed;

  return (
    <span className={`co-mark co-mark--${size}${showLogo ? " has-logo" : ""}`} aria-hidden title={name}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- local static marks; initial fallback on error
        <img src={src!} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        initial
      )}
    </span>
  );
}
