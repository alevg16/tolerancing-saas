import type { Metadata } from "next";
import Pricing from "@/components/marketing/Pricing";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { C, SANS } from "@/lib/design/tokens";

export const metadata: Metadata = { title: "Pricing · Tolerancing" };

export default function PricingPage() {
  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <MarketingNav />
      <div style={{ padding: "26px 0 40px" }}>
        <Pricing />
      </div>
      <MarketingFooter />
    </div>
  );
}
