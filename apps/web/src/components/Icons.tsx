import type { ReactNode } from "react";

type IconProps = { className?: string; title?: string };

/** Shared stroke icon: 24 viewBox, rendered ~20px for calm rail weight. */
function Svg({ className, title, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className ?? "nav-ico"}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
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
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.75" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.75" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.75" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.75" />
    </Svg>
  );
}

export function IconCompanies(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20V8.2L12 3.5l8 4.7V20" />
      <path d="M9.5 20v-6h5v6" />
    </Svg>
  );
}

export function IconInbox(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 8.5 5.2 4.8A2 2 0 0 1 7 3.5h10a2 2 0 0 1 1.8 1.3l1.7 3.7" />
      <path d="M3.5 8.5h4.2l1.3 2.4h6l1.3-2.4h4.2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9z" />
    </Svg>
  );
}

export function IconFlags(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 21V4" />
      <path d="M5 5.2h10.2l-1.8 3.4 1.8 3.4H5" />
    </Svg>
  );
}

export function IconNav(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 19 10.2 5h3.6L20 19" />
      <path d="M6.6 14.5h10.8" />
    </Svg>
  );
}

export function IconCompare(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 19V10" />
      <path d="M12 19V5" />
      <path d="M18 19v-6" />
      <path d="M4 19h16" />
    </Svg>
  );
}

export function IconAsk(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.4a2.8 2.8 0 0 1 5.4 1.2c0 1.9-2.7 2.4-2.7 4" />
      <path d="M12 17.2h.01" />
    </Svg>
  );
}

export function IconReports(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3.5h7.2L19.5 9v10.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2z" />
      <path d="M14 3.5V9h5.5" />
      <path d="M8.5 13h7M8.5 16.5h5" />
    </Svg>
  );
}

export function IconVault(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 9.5h14a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2z" />
      <path d="M8 9.5V7.2a4 4 0 0 1 8 0v2.3" />
      <path d="M12 14v3" />
    </Svg>
  );
}

export function IconSettings(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3.15" />
      <path d="M12 2.75v2.35M12 18.9v2.35M2.75 12h2.35M18.9 12h2.35M5.2 5.2l1.66 1.66M17.14 17.14l1.66 1.66M18.8 5.2l-1.66 1.66M6.86 17.14l-1.66 1.66" />
    </Svg>
  );
}

export function IconOrg(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h16" />
      <path d="M6.5 20V8.5L12 4.5l5.5 4V20" />
      <path d="M10 20v-4.5h4V20" />
    </Svg>
  );
}

export function IconUser(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 19.5c.8-3.4 3.2-5.1 7-5.1s6.2 1.7 7 5.1" />
    </Svg>
  );
}

export function IconRefresh(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4.5v5h-5" />
    </Svg>
  );
}

export function IconWarn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4.2 3.6 19.2h16.8L12 4.2z" />
      <path d="M12 10v4.2M12 16.8h.01" />
    </Svg>
  );
}

export function IconFlagSmall(p: IconProps) {
  return <IconFlags {...p} />;
}

export function IconLock(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
    </Svg>
  );
}

export function IconKey(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="12" r="3.4" />
      <path d="M11 12h9.5l-1.6 2.2v2.3h-2.2v-1.8H15v1.8h-2.2v-2.3" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.2" />
      <path d="M16 16.2 20.5 20.5" />
    </Svg>
  );
}

export function IconRailLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 5.5 9 12l5.5 6.5" />
      <path d="M18.5 5.5v13" />
    </Svg>
  );
}

export function IconRailRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.5 5.5 15 12l-5.5 6.5" />
      <path d="M5.5 5.5v13" />
    </Svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9.5 12 15.5 18 9.5" />
    </Svg>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v10" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </Svg>
  );
}

export function IconEdit(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4.8 19.2 10 8.5 20.7H3.3v-5.2z" />
      <path d="M12.2 6.6 17.4 11.8" />
    </Svg>
  );
}

/** Formula book — open book with mark. */
export function IconFormula(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 5.5c2.4-1 4.6-1 7.5 0v13c-2.9-1-5.1-1-7.5 0v-13z" />
      <path d="M19.5 5.5c-2.4-1-4.6-1-7.5 0v13c2.9-1 5.1-1 7.5 0v-13z" />
      <path d="M9.2 10.2h2.2M9.2 13.2h1.4" />
    </Svg>
  );
}

/** Live source wiring. */
export function IconConnectors(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 7V4.8a2 2 0 0 1 4 0V7" />
      <path d="M7 7h7v3.8l-1.4 1.4V19H8.4v-6.8L7 10.8V7z" />
      <path d="M4.5 11.5H2.8M18.2 11.5h1.7" />
      <path d="M4.5 14.5H2.8M18.2 14.5h1.7" />
    </Svg>
  );
}

export function IconFirm(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h16" />
      <path d="M6 20V6.5a1.5 1.5 0 0 1 1.5-1.5H12v15" />
      <path d="M12 9.5h5.5A1.5 1.5 0 0 1 19 11V20" />
    </Svg>
  );
}

export function IconFunds(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2v9.6" />
      <path d="M9.4 9.4c.7-1 2-1.6 3.4-1.2 1.6.4 2.2 1.6 2.2 2.6 0 2-3.2 2.4-3.2 4.2 0 .9.6 1.8 2.2 2.1 1.2.2 2.4-.2 3.1-1.1" />
    </Svg>
  );
}

export function IconPeople(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.7-3 2.7-4.5 5.5-4.5" />
      <circle cx="16.5" cy="9" r="2.4" />
      <path d="M13.2 19c.5-2.4 2-3.6 4-3.6 1.4 0 2.6.5 3.5 1.5" />
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
