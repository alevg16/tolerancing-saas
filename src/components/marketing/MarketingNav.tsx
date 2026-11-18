import Link from "next/link";
import { C } from "@/lib/design/tokens";

const link: React.CSSProperties = { fontSize: 13, color: C.sub, textDecoration: "none", padding: "8px 10px" };

export default function MarketingNav() {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 22px", maxWidth: 1040, margin: "0 auto" }}>
      <Link href="/" className="mono" style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 600, color: C.ink, textDecoration: "none", marginRight: 6 }}>
        Tolerancing
      </Link>
      <span style={{ flex: 1 }} />
      <Link href="/calculators" style={link}>Calculators</Link>
      <Link href="/pricing" style={link}>Pricing</Link>
      <Link href="/login" style={link}>Sign in</Link>
      <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, textDecoration: "none", borderRadius: 8, padding: "9px 14px" }}>Get started</Link>
    </header>
  );
}
