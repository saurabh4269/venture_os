"use client";

/** Calm three-dot busy mark — Ask / wake. Prefer over flashy loaders for the book. */
export function BusyDots({ label, className }: { label?: string; className?: string }) {
  return (
    <span className={`busy-row${className ? ` ${className}` : ""}`} role="status">
      <span className="busy-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      {label ? <span>{label}</span> : null}
    </span>
  );
}
