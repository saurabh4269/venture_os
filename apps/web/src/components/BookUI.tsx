import Link from "next/link";
import type { ReactNode } from "react";
import { formatOwnership } from "@/lib/format";

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
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
  kicker?: ReactNode;
}) {
  return (
    <section className={`panel${className ? ` ${className}` : ""}`}>
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

export function SettingsSubnav({ current }: { current: "firm" | "connectors" }) {
  return (
    <nav className="settings-subnav" aria-label="Settings sections">
      <Link href="/settings" className={current === "firm" ? "on" : undefined} aria-current={current === "firm" ? "page" : undefined}>
        Firm
      </Link>
      <Link href="/settings#people">Members</Link>
      <Link
        href="/settings/connectors"
        className={current === "connectors" ? "on" : undefined}
        aria-current={current === "connectors" ? "page" : undefined}
      >
        Connectors
      </Link>
    </nav>
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
        <p>Portfolio operating system</p>
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
      <p className="auth-principles">AES-backed vault · Cite-or-refuse · Institutional calm</p>
      <p className="auth-foot">© 2026 Venture OS. Keys are AES-encrypted at rest. SSO and password reset by email are not connected.</p>
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
