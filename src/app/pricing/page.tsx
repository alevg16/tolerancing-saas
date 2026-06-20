import type { Metadata } from "next";
import Link from "next/link";
import Pricing from "@/components/marketing/Pricing";
import { C, SANS } from "@/lib/design/tokens";

export const metadata: Metadata = { title: "Pricing · Tolerancing" };

export default function PricingPage() {
  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", maxWidth: 1040, margin: "0 auto" }}>
        <Link href="/" className="mono" style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 600, color: C.ink, textDecoration: "none" }}>Tolerancing</Link>
        <span style={{ flex: 1 }} />
        <Link href="/login" style={{ fontSize: 13, color: C.sub, textDecoration: "none", padding: "8px 10px" }}>Sign in</Link>
        <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, textDecoration: "none", borderRadius: 8, padding: "9px 14px" }}>Get started</Link>
      </header>
      <div style={{ padding: "30px 0 50px" }}>
        <Pricing />
      </div>
    </div>
  );
}
