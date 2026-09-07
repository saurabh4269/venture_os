"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion-ease";

/**
 * In-place reject confirm — Rare UI delete-button pattern, adapted for Confirm
 * (reject proposed rows, never delete booked facts).
 */
export function RejectConfirm({
  busy,
  onReject,
  testId = "inbox-reject",
}: {
  busy?: boolean;
  onReject: () => void | Promise<void>;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        className="btn ghost sm"
        disabled={busy}
        onClick={() => setOpen(true)}
        data-testid={testId}
      >
        Reject
      </button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="reject-confirm"
        className="reject-confirm"
        role="group"
        aria-labelledby={labelId}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={reduce ? { duration: 0.12 } : SPRING_SOFT}
      >
        <span id={labelId} className="reject-confirm-label">
          Reject?
        </span>
        <button
          type="button"
          className="btn warn sm"
          disabled={busy}
          data-testid={`${testId}-yes`}
          onClick={async () => {
            await onReject();
            setOpen(false);
          }}
        >
          Yes
        </button>
        <button
          type="button"
          className="btn ghost sm"
          disabled={busy}
          data-testid={`${testId}-no`}
          onClick={() => setOpen(false)}
        >
          No
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
