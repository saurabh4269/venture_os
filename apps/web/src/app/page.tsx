import type { Metadata } from "next";
import { HomeSessionRedirect } from "@/components/marketing/HomeSessionRedirect";
import { MarketingLanding } from "@/components/marketing/MarketingLanding";

export const metadata: Metadata = {
  title: "Venture OS — The book for the investment team.",
  description:
    "Portfolio OS for investment teams. Command, Inbox, Flags, and Reports read from your confirmed book.",
};

export default function Home() {
  return (
    <>
      <HomeSessionRedirect />
      <MarketingLanding />
    </>
  );
}
