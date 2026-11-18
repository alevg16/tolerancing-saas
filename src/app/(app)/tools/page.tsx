import type { Metadata } from "next";
import { getModulesWithTiers } from "@/lib/data/moduleTiers";
import ToolGrid from "@/components/tools/ToolGrid";
import { C } from "@/lib/design/tokens";

export const metadata: Metadata = { title: "Tools · Tolerancing" };

export default async function ToolsPage() {
  const modules = await getModulesWithTiers();
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "30px 22px 56px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 6px" }}>Tools</h1>
      <p style={{ fontSize: 13.5, color: C.sub, margin: "0 0 26px", maxWidth: 620, lineHeight: 1.5 }}>
        Pick a calculator by what you&apos;re trying to answer. Stack-ups, allocation and the
        analysis tools save as projects; the quick fit/thread/torque tools run as scratchpads.
      </p>
      <ToolGrid modules={modules} context="app" />
    </div>
  );
}
