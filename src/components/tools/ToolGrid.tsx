import Link from "next/link";
import {
  CircleDot, Spline, Wrench, Combine, Ruler, SlidersHorizontal,
  Thermometer, Layers, Crosshair, Target, Settings, Lock, type LucideIcon,
} from "lucide-react";
import { CATEGORIES, type ModuleDef } from "@/lib/modules";
import { C } from "@/lib/design/tokens";

const ICONS: Record<string, LucideIcon> = {
  CircleDot, Spline, Wrench, Combine, Ruler, SlidersHorizontal,
  Thermometer, Layers, Crosshair, Target, Settings,
};

/**
 * Grouped, decision-oriented tool browser. `context` decides link targets and
 * whether Pro tools render as live links (app) or locked upsell cards (public).
 */
export default function ToolGrid({
  modules,
  context,
}: {
  modules: ModuleDef[];
  context: "app" | "public";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      {CATEGORIES.map((cat) => {
        const inCat = modules.filter((m) => m.category === cat.key);
        if (inCat.length === 0) return null;
        return (
          <section key={cat.key}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 680, margin: 0, color: C.ink }}>{cat.label}</h2>
              <p style={{ fontSize: 12.5, color: C.sub, margin: "2px 0 0" }}>{cat.blurb}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {inCat.map((m) => (
                <ToolCard key={m.slug} m={m} context={context} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ToolCard({ m, context }: { m: ModuleDef; context: "app" | "public" }) {
  const Icon = ICONS[m.icon] ?? CircleDot;
  const locked = context === "public" && m.tier === "pro";
  const href = locked ? "/pricing" : context === "app" ? `/tools/${m.slug}` : `/calculators/${m.slug}`;

  return (
    <Link
      href={href}
      className="tool-card"
      style={{
        display: "flex", flexDirection: "column", gap: 10, textDecoration: "none",
        color: C.ink, background: C.panel, border: `1px solid ${C.line}`,
        borderRadius: 14, padding: "15px 16px", height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <span
          aria-hidden
          style={{
            flexShrink: 0, width: 38, height: 38, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: locked ? C.paper : C.accentBg, color: locked ? C.faint : C.accent,
            border: `1px solid ${locked ? C.line : "transparent"}`,
          }}
        >
          <Icon size={19} strokeWidth={1.9} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 650, lineHeight: 1.2 }}>{m.label}</span>
            <TierBadge tier={m.tier} locked={locked} />
          </div>
          <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>{m.standard}</div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: C.sub, margin: 0, lineHeight: 1.5, flex: 1 }}>
        <span style={{ color: C.faint }}>Use it when </span>{lowerFirst(m.useWhen)}
      </p>

      <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: locked ? C.faint : C.accent, display: "inline-flex", alignItems: "center", gap: 5 }}>
        {locked ? <><Lock size={11} /> Unlock with Pro</> : <>Open tool →</>}
      </span>
    </Link>
  );
}

function TierBadge({ tier, locked }: { tier: "free" | "pro"; locked: boolean }) {
  const free = tier === "free";
  return (
    <span
      className="mono"
      style={{
        flexShrink: 0, fontSize: 9.5, letterSpacing: ".05em", textTransform: "uppercase",
        color: free ? C.ok : locked ? C.faint : C.accent,
        background: free ? C.okBg : locked ? C.paper : C.accentBg,
        borderRadius: 5, padding: "3px 7px",
      }}
    >
      {free ? "Free" : "Pro"}
    </span>
  );
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
