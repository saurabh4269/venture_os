import type { Metadata } from "next";
import { HomeSessionRedirect } from "@/components/marketing/HomeSessionRedirect";
import { MarketingLanding } from "@/components/marketing/MarketingLanding";

export const metadata: Metadata = {
  title: "Venture OS — The book for the investment team.",
  description:
    "Portfolio OS that cites or refuses. Command, Inbox, Flags, and Reports read only from confirmed facts. Design partner: V3 Ventures.",
};

export default function Home() {
  return (
    <>
      <HomeSessionRedirect />
      <MarketingLanding />
    </>
  );
}
