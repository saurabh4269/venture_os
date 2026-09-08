"use client";

/**
 * Ask composer — beUI Prompt Input + Beautiful UI Prompt Bar.
 * Auto-grow, Enter-to-send, send↔stop swap, optional scope chip.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { SPRING_SOFT } from "@/lib/motion-ease";

export function AskComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  placeholder,
  disabled,
  leading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Scope chip / company select — sits under the textarea like beUI prompt actions. */
  leading?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length >= 3 && !busy && !disabled;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(Math.max(el.scrollHeight, 48), 168);
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
      <div className="ask-composer-bar">
        <div className="ask-composer-leading">{leading}</div>
        <AnimatePresence mode="wait" initial={false}>
          {busy ? (
            <motion.button
              key="stop"
              type="button"
              className="ask-send is-busy"
              data-testid="ask-stop"
              aria-label="Searching"
              onClick={() => onStop?.()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              transition={SPRING_SOFT}
              whileTap={reduce ? undefined : { scale: 0.92 }}
            >
              <span className="ask-send-stop" aria-hidden />
            </motion.button>
          ) : (
            <motion.button
              key="send"
              type="submit"
              className="ask-send"
              data-testid="ask-submit"
              disabled={!canSend}
              aria-label="Send"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              transition={SPRING_SOFT}
              whileTap={reduce || !canSend ? undefined : { scale: 0.92 }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M8 12.5V3.5M8 3.5 4.5 7M8 3.5 11.5 7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
