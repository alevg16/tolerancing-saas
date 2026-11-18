import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { C, SANS } from "@/lib/design/tokens";

export default function LegalChrome({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: SANS, color: C.ink }}>
      <MarketingNav />
      <main style={{ maxWidth: 740, margin: "0 auto", padding: "26px 22px 40px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 680, margin: "0 0 6px" }}>{title}</h1>
        <p className="mono" style={{ fontSize: 11.5, color: C.faint, margin: "0 0 22px" }}>Last updated {updated}</p>
        <div className="prose">{children}</div>
      </main>
      <MarketingFooter />
    </div>
  );
}
