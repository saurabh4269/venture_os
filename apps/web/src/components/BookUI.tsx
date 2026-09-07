"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";
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
}: {
  title: string;
  lede?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  testId?: string;
  badge?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        {kicker ? <p className="page-kicker">{kicker}</p> : null}
        <div className="page-title-row">
          <h1 data-testid={testId}>{title}</h1>
          {badge}
        </div>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
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

export function SettingsSubnav({ current }: { current: SettingsTab }) {
  const layoutId = useId();
  const reduce = useReducedMotion();
  const tabs: { id: SettingsTab; href: string; label: string }[] = [
    { id: "formula", href: "/settings?tab=formula", label: "Formula book" },
    { id: "flags", href: "/settings?tab=flags", label: "Flag policy" },
    { id: "connectors", href: "/settings/connectors", label: "Connectors" },
    { id: "firm", href: "/settings?tab=firm", label: "Firm" },
    { id: "funds", href: "/settings?tab=funds", label: "Funds" },
    { id: "people", href: "/settings?tab=people", label: "People" },
  ];
  return (
    <nav className="settings-subnav" aria-label="Settings">
      {tabs.map((t) => {
        const on = current === t.id;
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

/** Retrieved-knowledge style tile for Ask / cite excerpts. */
export function ContextCard({
  kicker,
  body,
  action,
}: {
  kicker?: ReactNode;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="context-card">
      {kicker ? <div className="context-card-kicker">{kicker}</div> : null}
      <div className="context-card-body">{body}</div>
      {action ? <div className="context-card-action">{action}</div> : null}
    </div>
  );
}

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

export const EM = "—";

export function CompanyMark({ name }: { name: string }) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <span className="co-mark" aria-hidden>
      {initial}
    </span>
  );
}
