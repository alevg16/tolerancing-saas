import { notFound } from "next/navigation";
import { getModuleBySlug } from "@/lib/modules";
import { getCurrentOrg } from "@/lib/auth/dal";
import { getCurrentPlan } from "@/lib/auth/plan";
import CalculatorMount from "@/components/calculators/CalculatorMount";
import UpgradeWall from "@/components/billing/UpgradeWall";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mod = getModuleBySlug(slug);
  if (!mod) notFound();

  if (mod.tier === "pro") {
    const [{ isPro }, { membership }] = await Promise.all([
      getCurrentPlan(),
      getCurrentOrg(),
    ]);
    if (!isPro) {
      const canManage =
        membership.role === "owner" || membership.role === "admin";
      return <UpgradeWall moduleLabel={mod.label} canManage={canManage} />;
    }
  }

  return <CalculatorMount type={mod.type} />;
}
