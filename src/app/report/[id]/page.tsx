import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth/dal";
import { getCurrentPlan } from "@/lib/auth/plan";
import { getProject } from "@/lib/data/projects";
import { getModuleByType } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import ReportView from "@/components/report/ReportView";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect(`/login?redirectTo=/report/${id}`);

  // Branded export is a Pro feature.
  const { isPro } = await getCurrentPlan();
  if (!isPro) redirect("/billing");

  const project = await getProject(id); // RLS scopes to the user's orgs
  if (!project) notFound();
  const mod = getModuleByType(project.module_type);
  if (!mod) notFound();

  // Brand the report with the project's workspace name.
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", project.organization_id)
    .maybeSingle();

  return (
    <ReportView
      project={project}
      orgName={org?.name ?? "Workspace"}
      moduleLabel={mod.label}
      standard={mod.standard}
      preparedBy={user.email ?? ""}
    />
  );
}
