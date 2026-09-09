import type { Metadata, Viewport } from "next";
import { Geist, IBM_Plex_Sans, Newsreader, Source_Serif_4 } from "next/font/google";
import { RegisterPwa } from "@/components/RegisterPwa";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});
const serif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-serif",
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-mkt",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mkt-display",
});

export const metadata: Metadata = {
  title: "Venture OS",
  description: "The book for VC investment teams. Cite or refuse; missing stays blank.",
  applicationName: "Venture OS",
  appleWebApp: {
    capable: true,
    title: "Venture OS",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

const THEME_BOOT = `(function(){try{var t=localStorage.getItem("vos-theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${geist.variable} ${newsreader.variable}`} data-theme="light" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <RegisterPwa />
        {children}
      </body>
    </html>
  );
}
