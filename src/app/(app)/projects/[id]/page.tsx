import { notFound } from "next/navigation";
import { getProject } from "@/lib/data/projects";
import { getModuleByType } from "@/lib/modules";
import ProjectWorkspace from "@/components/projects/ProjectWorkspace";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id); // RLS scopes this to the user's orgs
  if (!project) notFound();

  const mod = getModuleByType(project.module_type);
  if (!mod) notFound();

  return <ProjectWorkspace project={project} moduleLabel={mod.label} />;
}
