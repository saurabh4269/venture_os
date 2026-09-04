export function LoadingLine({ children = "Loading the book…" }: { children?: string }) {
  return (
    <p className="lede" role="status" aria-live="polite">
      {children}
    </p>
  );
}

export function ErrorLine({ children }: { children: string }) {
  return (
    <p className="sev-high" role="alert">
      {children}
    </p>
  );
}

export function EmptyBook({ children }: { children: import("react").ReactNode }) {
  return <div className="empty">{children}</div>;
}
