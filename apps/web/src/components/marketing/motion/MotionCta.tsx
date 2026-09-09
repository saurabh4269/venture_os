import Link from "next/link";
import type { ComponentProps } from "react";

type MotionCtaProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "ghost";
};

/** Primary / ghost CTA. Hover lift lives on `.mkt-cta` so the link stays clickable. */
export function MotionCta({ variant = "primary", className, children, ...rest }: MotionCtaProps) {
  const cls = [
    variant === "ghost" ? "btn ghost" : "btn mkt-cta",
    "mkt-motion-cta",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link className={cls} {...rest}>
      {children}
    </Link>
  );
}
