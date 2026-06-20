import { notFound } from "next/navigation";
import { getProject } from "@/lib/data/projects";
import { getEffectiveModuleByType } from "@/lib/data/moduleTiers";
import { getCurrentOrg } from "@/lib/auth/dal";
import { getCurrentPlan } from "@/lib/auth/plan";
import ProjectWorkspace from "@/components/projects/ProjectWorkspace";
import UpgradeWall from "@/components/billing/UpgradeWall";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id); // RLS scopes this to the user's orgs
  if (!project) notFound();

  const mod = await getEffectiveModuleByType(project.module_type);
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

  return <ProjectWorkspace project={project} moduleLabel={mod.label} />;
}
