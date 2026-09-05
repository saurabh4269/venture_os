import type { ReactNode } from "react";

type IconProps = { className?: string; title?: string };

function Svg({ className, title, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className ?? "nav-ico"}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconCommand(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="2.5" width="5" height="5" rx="0.8" />
      <rect x="8.5" y="2.5" width="5" height="5" rx="0.8" />
      <rect x="2.5" y="8.5" width="5" height="5" rx="0.8" />
      <rect x="8.5" y="8.5" width="5" height="5" rx="0.8" />
    </Svg>
  );
}
export function IconCompanies(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 13.5V5.5L8 2.5l5 3V13.5" />
      <path d="M6.5 13.5v-4h3v4" />
    </Svg>
  );
}
export function IconInbox(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 4.5h11v8h-11z" />
      <path d="M2.5 8.5h3l1 2h3l1-2h3" />
    </Svg>
  );
}
export function IconFlags(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 13.5V2.5" />
      <path d="M4 3.2h7.2L9.6 5.8 11.2 8.4H4" />
    </Svg>
  );
}
export function IconNav(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 12.5 7.2 3.5h1.6L13 12.5" />
      <path d="M4.6 9.4h6.8" />
    </Svg>
  );
}
export function IconCompare(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12V6" />
      <path d="M8 12V3.5" />
      <path d="M12 12V8" />
    </Svg>
  );
}
export function IconAsk(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M6.2 6.2a2 2 0 0 1 3.5 1.1c0 1.2-1.7 1.5-1.7 2.6" />
      <path d="M8 11.6v.2" />
    </Svg>
  );
}
export function IconReports(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 13.5h7a1 1 0 0 0 1-1v-8L10 2.5H4.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1z" />
      <path d="M9.5 2.5v3h3" />
    </Svg>
  );
}
export function IconVault(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="4.5" width="11" height="9" rx="1" />
      <path d="M5 4.5V3.8a3 3 0 0 1 6 0v.7" />
    </Svg>
  );
}
export function IconSettings(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 2.4v1.4M8 12.2v1.4M2.4 8h1.4M12.2 8h1.4M4 4l1 1M11 11l1 1M12 4l-1 1M5 11l-1 1" />
    </Svg>
  );
}
export function IconOrg(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="5.2" r="2.2" />
      <path d="M3.4 13c.5-2.4 2.2-3.6 4.6-3.6S12.1 10.6 12.6 13" />
    </Svg>
  );
}
export function IconUser(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="5.6" r="2.3" />
      <path d="M3.2 13.2c.6-2.5 2.3-3.7 4.8-3.7s4.2 1.2 4.8 3.7" />
    </Svg>
  );
}
export function IconRefresh(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 8a5 5 0 1 1-1.4-3.5" />
      <path d="M13 2.8v3.2h-3.2" />
    </Svg>
  );
}
export function IconWarn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 2.6 2.6 13h10.8L8 2.6z" />
      <path d="M8 6.4v3.2M8 11.4v.3" />
    </Svg>
  );
}
export function IconFlagSmall(p: IconProps) {
  return <IconFlags {...p} />;
}
