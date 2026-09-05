import type { Metadata } from "next";
import { HomeSessionRedirect } from "@/components/marketing/HomeSessionRedirect";
import { MarketingLanding } from "@/components/marketing/MarketingLanding";

export const metadata: Metadata = {
  title: "Venture OS — the book for the investment team",
  description:
    "Command, cite, and act on the truth of your portfolio. Design partner: V3 Ventures. Cite or refuse; missing is —.",
};

export default function Home() {
  return (
    <>
      <HomeSessionRedirect />
      <MarketingLanding />
    </>
  );
}
