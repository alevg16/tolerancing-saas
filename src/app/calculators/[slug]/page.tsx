import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getEffectiveModuleBySlug } from "@/lib/data/moduleTiers";
import CalculatorMount from "@/components/calculators/CalculatorMount";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { C, SANS } from "@/lib/design/tokens";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mod = await getEffectiveModuleBySlug(slug);
  if (!mod) return { title: "Calculator · Tolerancing" };
  return {
    title: `${mod.label} calculator — ${mod.standard} · Tolerancing`,
    description: mod.blurb,
  };
}

export default async function PublicCalculatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mod = await getEffectiveModuleBySlug(slug);
  if (!mod) notFound();
  // Pro tools aren't public — route a shared link to the upsell instead.
  if (mod.tier !== "free") redirect("/pricing");

  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: SANS, color: C.ink }}>
      <MarketingNav />
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "10px 14px 36px" }}>
        <div style={{ padding: "0 8px", marginBottom: 12 }}>
          <Link href="/calculators" className="mono" style={{ fontSize: 12, color: C.sub, textDecoration: "none" }}>← All calculators</Link>
          <h1 style={{ fontSize: 25, fontWeight: 680, margin: "10px 0 3px" }}>{mod.label}</h1>
          <p className="mono" style={{ fontSize: 12, color: C.faint, margin: 0 }}>{mod.standard} · free, no account needed</p>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
          <CalculatorMount type={mod.type} />
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: C.sub }}>
          Save it, stack dimensions and unlock the full suite —{" "}
          <Link href="/login" style={{ color: C.accent, fontWeight: 600 }}>create a free account →</Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
