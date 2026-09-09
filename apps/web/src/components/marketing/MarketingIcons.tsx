import type { ReactNode } from "react";

export function IconBulb() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.7h5.4c.1-.7.4-1.3.9-1.7A6 6 0 0 0 12 3z" />
    </svg>
  );
}
export function IconBalloon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <ellipse cx="12" cy="10" rx="6" ry="7.2" />
      <path d="M12 17c0 2-1.2 4.5-1.2 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
export function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 5 6v6c0 4.2 2.8 7 7 8.4C16.2 19 19 16.2 19 12V6l-7-3z" />
      <path d="M12 8v5M10.2 14.2 12 16l3.2-3.4" />
    </svg>
  );
}
export function IconEyes() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      <ellipse cx="8" cy="12" rx="3.4" ry="4" />
      <ellipse cx="16" cy="12" rx="3.4" ry="4" />
      <circle cx="8.6" cy="12.4" r="1.2" fill="#111" />
      <circle cx="16.6" cy="12.4" r="1.2" fill="#111" />
    </svg>
  );
}
export function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="12" cy="12" r="8.2" />
      <path d="m8.4 12.2 2.4 2.4 4.8-5" />
    </svg>
  );
}
function LucideMark({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
export function IconCite() {
  return (
    <LucideMark>
      <path d="M10 13a5 5 0 0 0 7.54.54l1.92-1.92a5 5 0 0 0-7.07-7.07L11 6" />
      <path d="M14 11a5 5 0 0 0-7.54-.54L4.54 12.4a5 5 0 0 0 7.07 7.07L13 18" />
    </LucideMark>
  );
}
export function IconConfirm() {
  return (
    <LucideMark>
      <path d="M20 6 9 17l-5-5" />
    </LucideMark>
  );
}
export function IconBook() {
  return (
    <LucideMark>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </LucideMark>
  );
}
export function IconFlags() {
  return (
    <LucideMark>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </LucideMark>
  );
}
export function IconAsk() {
  return (
    <LucideMark>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </LucideMark>
  );
}
export function IconGears() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="12.2" cy="13.6" r="3.8" />
      <path d="M12.2 7.2v1.8M12.2 18.2v1.8M6.4 13.6h1.8M16.2 13.6h1.8M8 9.4l1.3 1.3M15.1 16.5l1.3 1.3M8 17.8l1.3-1.3M15.1 10.7l1.3-1.3" />
      <circle cx="20.4" cy="19.4" r="3.1" />
      <path d="M20.4 14.4v1.5M20.4 23v1.5M15.9 19.4h1.5M23.4 19.4h1.5" />
    </svg>
  );
}

export function IconOneDrive({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path d="M10.2 31.2c-3.6-1.4-6-4.8-6-8.8 0-4.4 3-8.1 7.1-9.2C13 8.4 17.8 5.6 23.4 5.6c6.2 0 11.5 3.6 13.8 8.8 1-.3 2.1-.4 3.2-.4 5.6 0 10.1 4.4 10.1 9.8 0 5.4-4.5 9.8-10.1 9.8H16.6c-2.3 0-4.5-.5-6.4-1.4z" fill="#28A8EA" />
      <path d="M8.6 29.6C6 27.8 4.4 24.6 4.4 21c0-4.2 2.6-7.8 6.4-9.2.2 7.8 5.6 14.4 13 16.8H16.2c-2.8 0-5.4-.7-7.6-2z" fill="#0364B8" />
      <path d="M39.2 15.8c1.2.4 2.3 1.1 3.2 2 2.6 2.5 4 6 3.4 9.8-.4 2.8-1.8 5.2-4 6.8H23.6c5.8-2.8 9.8-8.6 10.2-15.2 1.6-.8 3.6-1.6 5.4-3.4z" fill="#1490DF" />
    </svg>
  );
}
export function IconAffinity({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <rect x="5" y="5" width="38" height="38" rx="11" fill="#1B1F3B" />
      <path d="M24 12.2 34.2 36h-5l-1.9-4.6H20.7L18.8 36h-5L24 12.2zm-2.4 14.8h4.8L24 20.4l-2.4 6.6z" fill="#fff" />
    </svg>
  );
}
export function IconGranola({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="18.5" fill="#F4C14D" />
      <circle cx="17.8" cy="20.2" r="2.1" fill="#3A2A12" />
      <circle cx="30.2" cy="20.2" r="2.1" fill="#3A2A12" />
      <path d="M16.8 28.2c2.2 3.2 5.6 5 7.2 5s5-1.8 7.2-5" fill="none" stroke="#3A2A12" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}
export function IconXlsx({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <rect x="7" y="5" width="34" height="38" rx="7" fill="#107C41" />
      <path d="M16.4 16.4 24 24l7.6-7.6M16.4 31.6 24 24l7.6 7.6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
export function IconCsv({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <rect x="7" y="5" width="34" height="38" rx="7" fill="#0284C7" />
      <rect x="14" y="14" width="20" height="20" rx="3" fill="none" stroke="#fff" strokeWidth="2.2" />
      <path d="M14 21h20M14 27h20M21 14v20M27 14v20" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}
export function IconPdf({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <rect x="7" y="5" width="34" height="38" rx="7" fill="#E11D48" />
      <path d="M16 17h8.6c2.8 0 4.6 1.6 4.6 4.1s-1.8 4.1-4.6 4.1H19.8V33H16V17zm3.8 5.1h4c1.1 0 1.7-.6 1.7-1.4s-.6-1.4-1.7-1.4h-4v2.8z" fill="#fff" />
    </svg>
  );
}
export function IconZoho({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <rect x="5" y="5" width="38" height="38" rx="10" fill="#E42527" />
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fill="#fff"
        fontFamily="var(--font-mkt), ui-sans-serif, sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="-0.04em"
      >
        zoho
      </text>
    </svg>
  );
}
export function IconDrive({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path d="M15.2 32.8 24 17.4 32.8 32.8H15.2z" fill="#0F9D58" />
      <path d="M8 35.2 15.2 32.8 24 17.4 16.8 8.8 8 35.2z" fill="#0066DA" />
      <path d="M24 17.4 32.8 32.8 40 35.2 31.2 8.8 24 17.4z" fill="#FFBA00" />
    </svg>
  );
}
