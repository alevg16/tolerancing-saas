import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { LibraryItem } from "@/lib/types";

/**
 * Company standards library persistence. Runs as the signed-in user, so RLS
 * (library_items: read/write for org members) guarantees org isolation.
 */

export async function listLibraryItems(organizationId: string): Promise<LibraryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .eq("organization_id", organizationId)
    .order("type", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LibraryItem[];
}

export async function createLibraryItem(input: {
  organizationId: string;
  createdBy: string;
  type: string;
  name: string;
  data?: Record<string, unknown>;
}): Promise<LibraryItem> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      type: input.type,
      name: input.name,
      data: input.data ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as LibraryItem;
}

export async function updateLibraryItem(
  id: string,
  patch: { name?: string; data?: Record<string, unknown> },
): Promise<LibraryItem> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as LibraryItem;
}

export async function deleteLibraryItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("library_items").delete().eq("id", id);
  if (error) throw error;
}
