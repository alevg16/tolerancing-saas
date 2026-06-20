import Link from "next/link";
import HoleShaftFit from "@/components/calculators/HoleShaftFit";
import ModuleShowcase from "@/components/marketing/ModuleShowcase";
import Pricing from "@/components/marketing/Pricing";
import { getModulesWithTiers } from "@/lib/data/moduleTiers";
import { C, MONO, SANS } from "@/lib/design/tokens";

export default async function LandingPage() {
  const modules = await getModulesWithTiers();

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS }}>
      {/* top bar */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", maxWidth: 1040, margin: "0 auto" }}>
        <span className="mono" style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 600 }}>Tolerancing</span>
        <span style={{ flex: 1 }} />
        <Link href="#pricing" style={{ fontSize: 13, color: C.sub, textDecoration: "none", padding: "8px 10px" }}>Pricing</Link>
        <Link href="/login" style={{ fontSize: 13, color: C.sub, textDecoration: "none", padding: "8px 10px" }}>Sign in</Link>
        <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, textDecoration: "none", borderRadius: 8, padding: "9px 14px" }}>Get started</Link>
      </header>

      {/* hero */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "44px 22px 26px", textAlign: "center" }}>
        <h1 style={{ fontSize: 34, fontWeight: 680, lineHeight: 1.15, margin: "0 0 14px" }}>
          Tolerance analysis that ships with the answer.
        </h1>
        <p style={{ fontSize: 16, color: C.sub, lineHeight: 1.55, margin: "0 auto 22px", maxWidth: 560 }}>
          ISO-grounded fit, stack-up, GD&amp;T, press-fit and gear calculators for mechanical teams —
          with saved projects, a shared company standards library and branded reports.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: C.accent, textDecoration: "none", borderRadius: 9, padding: "11px 20px" }}>Start free</Link>
          <Link href="#pricing" style={{ fontSize: 14, fontWeight: 600, color: C.accent, background: C.accentBg, textDecoration: "none", borderRadius: 9, padding: "11px 20px" }}>See plans</Link>
        </div>
      </section>

      {/* free tool hook */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "0 14px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 10 }}>
          <span className="mono" style={{ fontSize: 11, color: C.ok, background: C.okBg, border: `1px solid ${C.ok}33`, borderRadius: 6, padding: "4px 9px" }}>Free · no account</span>
          <span style={{ fontSize: 13, color: C.sub, fontFamily: MONO }}>Try the ISO 286 hole / shaft fit calculator</span>
        </div>
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
          <HoleShaftFit />
        </div>
        <p style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: C.sub }}>
          Want to save it, stack dimensions and share with your team?{" "}
          <Link href="/login" style={{ color: C.accent, fontWeight: 600 }}>Create a free account →</Link>
        </p>
      </section>

      {/* the suite */}
      <ModuleShowcase modules={modules} />

      {/* pricing */}
      <Pricing />

      {/* footer */}
      <footer style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 22px 48px", textAlign: "center", borderTop: `1px solid ${C.line}` }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: C.faint, marginBottom: 8 }}>Tolerancing</div>
        <p style={{ fontSize: 12.5, color: C.sub, margin: "0 0 10px" }}>
          Accuracy-first tolerance analysis for mechanical engineers. Values verified against ISO 286, ISO 965 and VDI 2230.
        </p>
        <Link href="/login" style={{ fontSize: 13, color: C.accent, fontWeight: 600, textDecoration: "none" }}>Get started →</Link>
      </footer>
    </div>
  );
}
