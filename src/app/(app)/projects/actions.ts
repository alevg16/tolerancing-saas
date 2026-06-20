"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, getCurrentOrg } from "@/lib/auth/dal";
import { getCurrentPlan } from "@/lib/auth/plan";
import {
  createProject,
  updateProject,
  softDeleteProject,
} from "@/lib/data/projects";
import { getModuleByType } from "@/lib/modules";
import type { ModuleType } from "@/lib/types";

/** Create a blank project for a saveable module, then open it. */
export async function createProjectAction(moduleType: ModuleType) {
  const user = await requireUser();
  const { organization } = await getCurrentOrg();

  const mod = getModuleByType(moduleType);
  if (!mod || !mod.saveable) {
    throw new Error("This module can't be saved as a project yet.");
  }

  // Saving is a Pro feature — gate server-side from the synced plan.
  if (mod.tier === "pro") {
    const { isPro } = await getCurrentPlan();
    if (!isPro) redirect("/billing");
  }

  const project = await createProject({
    organizationId: organization.id,
    createdBy: user.id,
    name: `Untitled ${mod.label}`,
    moduleType,
    data: {},
  });

  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(
  id: string,
  patch: { name?: string; data?: Record<string, unknown> },
): Promise<{ ok: true } | { error: string }> {
  await requireUser();
  try {
    await updateProject(id, patch);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save." };
  }
  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteProjectAction(id: string) {
  await requireUser();
  await softDeleteProject(id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
