export function WakingBook({
  message,
  detail,
  onRetry,
  busy = true,
  testId = "shell-busy",
}: {
  message: string;
  detail?: string;
  onRetry?: () => void;
  busy?: boolean;
  testId?: string;
}) {
  return (
    <div className="auth-shell">
      <div className="auth" role="status" aria-busy={busy} data-testid={testId}>
        <div className="auth-mark">Venture OS · the book</div>
        <p className="lede">{message}</p>
        {detail ? <p className="lede">{detail}</p> : null}
        {onRetry ? (
          <button className="btn" type="button" onClick={onRetry} disabled={busy} style={{ marginTop: 16 }}>
            {busy ? "Trying again…" : "Try again"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
