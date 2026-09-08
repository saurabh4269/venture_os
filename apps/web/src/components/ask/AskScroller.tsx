"use client";

/**
 * Reader-aware Ask viewport — inspired by beUI Message Scroller.
 * Follows the live edge while the reader stays near the bottom; releases when they scroll up.
 */
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "motion/react";

export function AskScroller({
  children,
  followKey,
  busy,
  label = "Ask thread",
}: {
  children: ReactNode;
  /** Bump when content grows (turns, reveal ticks, thinking). */
  followKey: string | number;
  busy?: boolean;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const programmaticRef = useRef(false);
  const [following, setFollowing] = useState(true);
  const threshold = 72;

  const isNearEnd = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, []);

  const scrollToEnd = useCallback(
    (smooth: boolean) => {
      const el = viewportRef.current;
      if (!el) return;
      programmaticRef.current = true;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth && !reduce ? "smooth" : "auto",
      });
      window.setTimeout(() => {
        programmaticRef.current = false;
      }, smooth && !reduce ? 320 : 40);
    },
    [reduce],
  );

  useLayoutEffect(() => {
    if (!followingRef.current) return;
    scrollToEnd(true);
  }, [followKey, busy, scrollToEnd]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function onScroll() {
      if (programmaticRef.current) return;
      const near = isNearEnd();
      if (near !== followingRef.current) {
        followingRef.current = near;
        setFollowing(near);
      }
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isNearEnd]);

  function jumpToLive() {
    followingRef.current = true;
    setFollowing(true);
    scrollToEnd(true);
  }

  return (
    <div className="ask-scroller">
      <div
        ref={viewportRef}
        className="ask-chat-scroll"
        role="log"
        aria-live="polite"
        aria-busy={busy || undefined}
        aria-label={label}
      >
        {children}
      </div>
      {!following ? (
        <button type="button" className="ask-jump-live" onClick={jumpToLive}>
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}
