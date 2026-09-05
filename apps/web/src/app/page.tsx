import type { Metadata } from "next";
import { HomeSessionRedirect } from "@/components/marketing/HomeSessionRedirect";
import { MarketingLanding } from "@/components/marketing/MarketingLanding";

export const metadata: Metadata = {
  title: "Venture OS — Truth you can cite.",
  description:
    "Portfolio OS that refuses to invent numbers. Precision-engineered for conviction. Design partner: V3 Ventures.",
};

export default function Home() {
  return (
    <>
      <HomeSessionRedirect />
      <MarketingLanding />
    </>
  );
}
