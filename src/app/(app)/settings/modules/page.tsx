import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAppAdmin, adminEmails } from "@/lib/auth/admin";
import { getModulesWithTiers } from "@/lib/data/moduleTiers";
import ModuleTierTable from "@/components/settings/ModuleTierTable";
import { C } from "@/lib/design/tokens";

export const metadata: Metadata = { title: "Module tiers · Tolerancing" };

export default async function ModuleTiersPage() {
  // App-owner only. If APP_ADMIN_EMAILS is unset nobody qualifies → 404.
  if (!(await isAppAdmin())) {
    if (adminEmails().length === 0) {
      return (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "30px 22px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 10px" }}>Module tiers</h1>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", fontSize: 13.5, color: C.sub, lineHeight: 1.6 }}>
            Set <code className="mono">APP_ADMIN_EMAILS</code> (comma-separated) in your environment to your
            owner email to manage which modules are free or paid, then reload. This keeps product pricing
            out of reach of customer org admins.
          </div>
        </div>
      );
    }
    notFound();
  }

  const modules = await getModulesWithTiers();
  return (
    <ModuleTierTable
      modules={modules.map((m) => ({ slug: m.slug, type: m.type, label: m.label, standard: m.standard, tier: m.tier, saveable: m.saveable }))}
    />
  );
}
