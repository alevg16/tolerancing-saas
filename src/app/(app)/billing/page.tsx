import type { Metadata } from "next";
import { getCurrentOrg } from "@/lib/auth/dal";
import { getCurrentPlan } from "@/lib/auth/plan";
import { getProPrices } from "@/lib/billing";
import { openPortalAction } from "./actions";
import BillingUpgrade from "@/components/billing/BillingUpgrade";
import { MODULES } from "@/lib/modules";
import { C, MONO } from "@/lib/design/tokens";

export const metadata: Metadata = { title: "Billing · Tolerancing" };

const PRO_PERKS = [
  "Every Pro tool — Linear Stack-Up, Tolerance Allocation",
  "Save & reopen projects (your whole workspace)",
  "Invite teammates & share a workspace",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  const [{ plan, status, isPro }, { membership }, prices] = await Promise.all([
    getCurrentPlan(),
    getCurrentOrg(),
    getProPrices(),
  ]);
  const canManage = membership.role === "owner" || membership.role === "admin";
  const proTools = MODULES.filter((m) => m.tier === "pro").map((m) => m.label);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "30px 22px 56px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 6px" }}>Billing</h1>
      <p style={{ fontSize: 13, color: C.sub, margin: "0 0 22px" }}>
        Your plan applies to the whole workspace.
      </p>

      {upgraded && (
        <div
          className="mono"
          style={{
            fontSize: 12.5,
            color: C.ok,
            background: C.okBg,
            border: `1px solid ${C.ok}33`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 16,
          }}
        >
          Thanks — your upgrade is processing. Pro unlocks within a few seconds.
        </div>
      )}

      <section
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          padding: "20px 22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: C.faint }}>Current plan</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: isPro ? C.accent : C.ink }}>
              {isPro ? "Pro" : "Free"}
            </div>
          </div>
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: isPro ? C.ok : C.sub,
              background: isPro ? C.okBg : C.paper,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              padding: "5px 10px",
            }}
          >
            {plan} · {status}
          </span>
        </div>

        <div style={{ height: 1, background: C.line, margin: "18px 0" }} />

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          Pro includes
        </div>
        <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
          {PRO_PERKS.map((p) => (
            <li key={p} style={{ fontSize: 13, color: C.sub, display: "flex", gap: 8 }}>
              <span style={{ color: C.ok }}>✓</span> {p}
            </li>
          ))}
        </ul>

        {!canManage ? (
          <p className="mono" style={{ fontSize: 12, color: C.faint }}>
            Ask a workspace owner or admin to change the plan.
          </p>
        ) : isPro ? (
          <form action={openPortalAction}>
            <button type="submit" style={btn(false)}>Manage subscription</button>
          </form>
        ) : (
          <BillingUpgrade month={prices.month} year={prices.year} />
        )}
      </section>

      <p className="mono" style={{ fontSize: 11, color: C.faint, marginTop: 14, lineHeight: 1.6 }}>
        Free tools stay free: {MODULES.filter((m) => m.tier === "free").map((m) => m.label).join(", ")}.
        Pro tools: {proTools.join(", ")}.
      </p>
    </div>
  );
}

function btn(primary: boolean): React.CSSProperties {
  return {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: 600,
    color: primary ? "#fff" : C.sub,
    background: primary ? C.accent : "#fff",
    border: primary ? "none" : `1px solid ${C.line}`,
    borderRadius: 9,
    padding: "11px 18px",
    cursor: "pointer",
  };
}
