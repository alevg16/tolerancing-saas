"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg, requireUser } from "@/lib/auth/dal";
import { createLibraryItem, updateLibraryItem, deleteLibraryItem } from "@/lib/data/library";
import { kindDef } from "@/lib/standards";

/**
 * Standards-library mutations. Server Actions are public endpoints, so each
 * re-resolves the signed-in user and org; RLS then scopes every write to that
 * org's library_items rows.
 */

export async function createStandardAction(kind: string, name: string, data: Record<string, string>) {
  if (!kindDef(kind)) throw new Error("Unknown standard kind");
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new Error("A name is required");
  const user = await requireUser();
  const { organization } = await getCurrentOrg();
  await createLibraryItem({ organizationId: organization.id, createdBy: user.id, type: kind, name: trimmed, data });
  revalidatePath("/standards");
}

export async function updateStandardAction(id: string, name: string, data: Record<string, string>) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new Error("A name is required");
  await requireUser();
  await getCurrentOrg(); // RLS scopes the update to the caller's org
  await updateLibraryItem(id, { name: trimmed, data });
  revalidatePath("/standards");
}

export async function deleteStandardAction(id: string) {
  await requireUser();
  await getCurrentOrg();
  await deleteLibraryItem(id);
  revalidatePath("/standards");
}

export async function seedStarterAction(kind: string) {
  const def = kindDef(kind);
  if (!def) throw new Error("Unknown standard kind");
  const user = await requireUser();
  const { organization } = await getCurrentOrg();
  for (const ex of def.examples) {
    await createLibraryItem({ organizationId: organization.id, createdBy: user.id, type: kind, name: ex.name, data: ex.data });
  }
  revalidatePath("/standards");
}
