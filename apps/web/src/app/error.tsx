"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const raw = error.message || "";
  const truncated = /unterminated string|truncated response|not valid json/i.test(raw);
  const message = truncated
    ? "The book returned a truncated response. Refresh and try again."
    : "Something went wrong opening this page. Refresh, or sign in again.";

  return (
    <div className="auth-shell">
    <div className="auth">
      <div className="auth-mark">Venture OS · the book</div>
      <h1>Could not open this page</h1>
      <p className="lede" role="alert">
        {message}
      </p>
      <button className="btn" type="button" onClick={() => reset()}>
        Try again
      </button>
    </div>
    </div>
  );
}
