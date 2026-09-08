import type { ReactNode } from "react";

type IconProps = { className?: string; title?: string };

/** Shared stroke icon: soft 24 viewBox, calm rail weight. */
function Svg({ className, title, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className ?? "nav-ico"}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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
      <rect x="3.5" y="3.5" width="7" height="7" rx="2.25" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2.25" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2.25" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2.25" />
    </Svg>
  );
}

export function IconCompanies(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 19.5h15" />
      <path d="M6.5 19.5V8.75c0-.69.42-1.3 1.06-1.55L12 5.5l4.44 1.7c.64.25 1.06.86 1.06 1.55V19.5" />
      <path d="M10 19.5v-5.25c0-.41.34-.75.75-.75h2.5c.41 0 .75.34.75.75V19.5" />
    </Svg>
  );
}

export function IconInbox(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 8.75 5.55 5.4A2.25 2.25 0 0 1 7.6 4.25h8.8a2.25 2.25 0 0 1 2.05 1.15L20 8.75" />
      <path d="M4 8.75h4.1l1.15 2.1h5.5l1.15-2.1H20v8.5A2.25 2.25 0 0 1 17.75 19.5H6.25A2.25 2.25 0 0 1 4 17.25v-8.5z" />
    </Svg>
  );
}

export function IconFlags(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.5 20.5V4.75" />
      <path d="M5.5 5.25h9.75c.9 0 1.4 1.05.82 1.72L14.2 9.25l1.87 2.28c.58.67.08 1.72-.82 1.72H5.5" />
    </Svg>
  );
}

export function IconNav(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.25 18.75 10.4 5.5h3.2l5.15 13.25" />
      <path d="M7.6 14.25h8.8" />
    </Svg>
  );
}

export function IconCompare(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 18.75V10.5" />
      <path d="M12 18.75V5.5" />
      <path d="M17.5 18.75v-5.5" />
      <path d="M4.5 18.75h15" />
      <circle cx="6.5" cy="10.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="5.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="13.25" r="1.15" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconAsk(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M9.35 9.55a2.65 2.65 0 0 1 5.15 1.15c0 1.75-2.5 2.25-2.5 3.85" />
      <circle cx="12" cy="17.15" r="0.85" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconReports(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7.25 3.75h6.6L19.25 9.1v10.4a1.85 1.85 0 0 1-1.85 1.85H7.25a1.85 1.85 0 0 1-1.85-1.85V5.6a1.85 1.85 0 0 1 1.85-1.85z" />
      <path d="M13.75 3.75v4.6c0 .4.32.72.72.72h4.78" />
      <path d="M8.75 13h6.5M8.75 16.25h4.5" />
    </Svg>
  );
}

export function IconVault(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="10" width="16" height="10" rx="2.5" />
      <path d="M8.25 10V7.6a3.75 3.75 0 0 1 7.5 0V10" />
      <circle cx="12" cy="14.75" r="1.15" fill="currentColor" stroke="none" />
      <path d="M12 15.9v1.85" />
    </Svg>
  );
}

export function IconSettings(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="2.85" />
      <path d="M19.4 14.1a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9.9a1.65 1.65 0 0 0 1-1.51V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9.9a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.1z" />
    </Svg>
  );
}

export function IconOrg(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 19.5h15" />
      <path d="M6.75 19.5V9c0-.69.42-1.3 1.06-1.55L12 5.75l4.19 1.7c.64.25 1.06.86 1.06 1.55v9.5" />
      <path d="M10.25 19.5v-4c0-.41.34-.75.75-.75h2c.41 0 .75.34.75.75v4" />
    </Svg>
  );
}

export function IconSun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 4.25v1.5M12 18.25v1.5M4.25 12h1.5M18.25 12h1.5M6.4 6.4l1.06 1.06M16.54 16.54l1.06 1.06M6.4 17.6l1.06-1.06M16.54 7.46l1.06-1.06" />
    </Svg>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15.6 4.75A7.5 7.5 0 1 0 19.25 14 6.1 6.1 0 0 1 15.6 4.75z" />
    </Svg>
  );
}

export function IconUser(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.25 19.25c.9-3.35 3.35-5 6.75-5s5.85 1.65 6.75 5" />
    </Svg>
  );
}

export function IconRefresh(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.75v4.6h-4.6" />
    </Svg>
  );
}

export function IconWarn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4.5 3.9 18.6c-.35.6.08 1.35.78 1.35h14.64c.7 0 1.13-.75.78-1.35L12 4.5z" />
      <path d="M12 10v4.1M12 16.85h.01" />
    </Svg>
  );
}

export function IconFlagSmall(p: IconProps) {
  return <IconFlags {...p} />;
}

export function IconLock(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5.25" y="10.5" width="13.5" height="9" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </Svg>
  );
}

export function IconKey(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="12" r="3.25" />
      <path d="M11.1 12h8.4l-1.35 1.85v2.1h-2.1v-1.55h-1.7v1.55h-2.1v-2.1" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6" />
      <path d="M15.75 15.75 20 20" />
    </Svg>
  );
}

export function IconRailLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.25 6 9.5 12l4.75 6" />
      <path d="M18.25 6.25v11.5" />
    </Svg>
  );
}

export function IconRailRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.75 6 14.5 12 9.75 18" />
      <path d="M5.75 6.25v11.5" />
    </Svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 9.75 12 15.25 17.5 9.75" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M17.5 6.5 6.5 17.5" />
    </Svg>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4.5v10" />
      <path d="M8 11.25 12 15.25 16 11.25" />
      <path d="M5.5 19.25h13" />
    </Svg>
  );
}

export function IconEdit(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.75 5.25 18.75 10.25 9 20H4v-5z" />
      <path d="M12.25 6.75 17.25 11.75" />
    </Svg>
  );
}

/** Formula book — open book with mark. */
export function IconFormula(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.75 6c2.2-.85 4.35-.85 7.25 0v12.25c-2.9-.9-5.05-.9-7.25 0V6z" />
      <path d="M19.25 6c-2.2-.85-4.35-.85-7.25 0v12.25c2.9-.9 5.05-.9 7.25 0V6z" />
      <path d="M9.5 10.5h2M9.5 13.25h1.35" />
    </Svg>
  );
}

/** Live source wiring. */
export function IconConnectors(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="7" cy="7" r="2.35" />
      <circle cx="17" cy="7" r="2.35" />
      <circle cx="12" cy="17" r="2.35" />
      <path d="M8.85 8.35 10.6 14.4M15.15 8.35 13.4 14.4" />
    </Svg>
  );
}

export function IconFirm(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 19.5h15" />
      <path d="M6.5 19.5V7.25c0-.97.78-1.75 1.75-1.75H12v14" />
      <path d="M12 9.75h4.75c.97 0 1.75.78 1.75 1.75V19.5" />
      <path d="M8.75 10h1.5M8.75 13h1.5M8.75 16h1.5M14.25 13h1.5M14.25 16h1.5" />
    </Svg>
  );
}

export function IconFunds(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5v9" />
      <path d="M9.6 9.6c.65-.9 1.9-1.45 3.15-1.1 1.45.4 2.05 1.5 2.05 2.45 0 1.85-3 2.2-3 3.9 0 .85.55 1.65 2.05 1.95 1.1.2 2.2-.2 2.9-1" />
    </Svg>
  );
}

export function IconPeople(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="2.85" />
      <path d="M3.75 19c.7-2.85 2.6-4.25 5.25-4.25" />
      <circle cx="16.35" cy="9" r="2.25" />
      <path d="M13.35 19c.5-2.25 1.9-3.4 3.75-3.4 1.3 0 2.45.5 3.3 1.4" />
    </Svg>
  );
}

/** Brand marks for connector tiles (simplified glyphs, not full logos). */
export function IconOnedrive(p: IconProps) {
  return (
    <svg className={p.className ?? "conn-brand-ico"} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      {p.title ? <title>{p.title}</title> : null}
      <path
        d="M8.2 17.2c-2.4 0-4.4-1.9-4.4-4.3 0-2.1 1.5-3.9 3.5-4.3C8 6.2 10.2 4.5 12.8 4.5c2.8 0 5.2 1.9 5.9 4.5 0.4-0.1 0.8-0.2 1.2-0.2 2.6 0 4.7 2.1 4.7 4.7 0 2.6-2.1 4.7-4.7 4.7H8.2z"
        fill="#0364B8"
      />
      <path
        d="M6.5 18.5c-2.1 0-3.8-1.6-3.8-3.7 0-1.8 1.3-3.3 3-3.6 0.5-1.8 2.2-3.1 4.2-3.1 0.7 0 1.4 0.2 2 0.5 0.8-1.5 2.4-2.5 4.2-2.5 2.4 0 4.4 1.7 4.9 4 2 0.3 3.5 2 3.5 4 0 2.2-1.8 4-4 4H6.5z"
        fill="#1490DF"
        opacity="0.92"
      />
    </svg>
  );
}

export function IconAffinity(p: IconProps) {
  return (
    <svg className={p.className ?? "conn-brand-ico"} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      {p.title ? <title>{p.title}</title> : null}
      <rect x="3" y="3" width="22" height="22" rx="6" fill="#1F1F1F" />
      <path d="M9 19.5 14 8.5l5 11H16.7L14 13.2 11.3 19.5H9z" fill="#FFFFFF" />
      <path d="M11.8 16.2h4.4" stroke="#7CFFB2" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconGranola(p: IconProps) {
  return (
    <svg className={p.className ?? "conn-brand-ico"} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      {p.title ? <title>{p.title}</title> : null}
      <rect x="3" y="3" width="22" height="22" rx="6" fill="#FFF4E5" />
      <path
        d="M9.2 18.8c1.2-3.4 2.8-5.6 4.8-6.6 2 1 3.6 3.2 4.8 6.6"
        stroke="#C45C26"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="14" cy="10.2" r="2.2" fill="#E8A05A" />
      <path d="M8.5 19.5h11" stroke="#8B5A2B" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
