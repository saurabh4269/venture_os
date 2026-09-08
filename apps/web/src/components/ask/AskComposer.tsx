"use client";

/**
 * Ask composer — beUI Prompt Input cues: auto-grow, Enter-to-send, animated send state.
 */
import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { SPRING_SOFT } from "@/lib/motion-ease";

export function AskComposer({
  value,
  onChange,
  onSubmit,
  busy,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length >= 3 && !busy && !disabled;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(Math.max(el.scrollHeight, 52), 160);
    el.style.height = `${next}px`;
  }, [value]);

  return (
    <form
      className="ask-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="ask-question">
        Question
      </label>
      <textarea
        ref={ref}
        id="ask-question"
        data-testid="ask-question"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        placeholder={placeholder}
        required
        minLength={3}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
      />
      <motion.button
        type="submit"
        className={`ask-send${busy ? " is-busy" : ""}`}
        data-testid="ask-submit"
        disabled={!canSend && !busy}
        aria-label={busy ? "Searching" : "Send"}
        whileTap={reduce || !canSend ? undefined : { scale: 0.92 }}
        transition={SPRING_SOFT}
      >
        {busy ? (
          <span className="ask-send-pulse" aria-hidden />
        ) : (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </motion.button>
    </form>
  );
}
