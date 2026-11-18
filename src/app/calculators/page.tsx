import type { Metadata } from "next";
import { getModulesWithTiers } from "@/lib/data/moduleTiers";
import ToolGrid from "@/components/tools/ToolGrid";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { C, SANS } from "@/lib/design/tokens";

export const metadata: Metadata = {
  title: "Engineering tolerance calculators · Tolerancing",
  description:
    "Free ISO 286 hole/shaft fit, ISO 965 thread fit and VDI 2230 bolt-torque calculators — plus the Pro suite of tolerance stack-up, GD&T, press-fit and gear tools for mechanical engineers.",
};

export default async function CalculatorsIndex() {
  const modules = await getModulesWithTiers();
  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: SANS, color: C.ink }}>
      <MarketingNav />
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "26px 22px 44px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 680, margin: "0 0 8px" }}>Engineering calculators</h1>
        <p style={{ fontSize: 15, color: C.sub, margin: "0 0 28px", maxWidth: 620, lineHeight: 1.55 }}>
          Standards-grounded tolerance tools — grouped by what you&apos;re trying to answer. The free
          ones need no account; Pro adds saved projects, a company standards library and branded reports.
        </p>
        <ToolGrid modules={modules} context="public" />
      </main>
      <MarketingFooter />
    </div>
  );
}
