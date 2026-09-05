import type { ReactNode } from "react";

export function PageHead({
  title,
  lede,
  kicker,
  actions,
  testId,
}: {
  title: string;
  lede?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  testId?: string;
}) {
  return (
    <header className="page-head">
      <div>
        {kicker ? <p className="page-kicker">{kicker}</p> : null}
        <h1 data-testid={testId}>{title}</h1>
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
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="panel">
      {(title || actions) && (
        <div className="panel-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions}
        </div>
      )}
      <div className={flush ? "panel-body flush" : "panel-body"}>{children}</div>
    </section>
  );
}

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth">
        <div className="auth-mark">Venture OS · the book</div>
        {children}
      </div>
    </div>
  );
}

export const EM = "—";
