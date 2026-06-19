import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ModuleType, Project } from "@/lib/types";

/**
 * Project persistence. Every call runs as the signed-in user, so Row-Level
 * Security guarantees org isolation even if a caller forgets to scope a query.
 */

export async function listProjects(organizationId: string): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return (data as Project) ?? null;
}

export async function createProject(input: {
  organizationId: string;
  createdBy: string;
  name: string;
  moduleType: ModuleType;
  data?: Record<string, unknown>;
}): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      name: input.name,
      module_type: input.moduleType,
      data: input.data ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(
  id: string,
  patch: { name?: string; data?: Record<string, unknown> },
): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Project;
}

export async function softDeleteProject(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
