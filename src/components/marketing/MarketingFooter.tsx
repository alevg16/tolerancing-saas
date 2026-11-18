import Link from "next/link";
import { C } from "@/lib/design/tokens";

const f: React.CSSProperties = { fontSize: 12.5, color: C.sub, textDecoration: "none" };

export default function MarketingFooter() {
  return (
    <footer style={{ maxWidth: 1000, margin: "0 auto", padding: "26px 22px 48px", borderTop: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: C.faint }}>
          Tolerancing
        </span>
        <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/calculators" style={f}>Calculators</Link>
          <Link href="/pricing" style={f}>Pricing</Link>
          <Link href="/terms" style={f}>Terms</Link>
          <Link href="/privacy" style={f}>Privacy</Link>
          <Link href="/imprint" style={f}>Imprint</Link>
        </nav>
      </div>
      <p style={{ fontSize: 11.5, color: C.faint, margin: "12px 0 0", lineHeight: 1.5, maxWidth: 640 }}>
        An engineering aid — verify all values against the governing standard (ISO 286, ISO 965, VDI 2230) before release.
        © {new Date().getFullYear()} Tolerancing.
      </p>
    </footer>
  );
}
