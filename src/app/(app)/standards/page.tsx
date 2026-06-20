import type { Metadata } from "next";
import { getCurrentOrg } from "@/lib/auth/dal";
import { listLibraryItems } from "@/lib/data/library";
import StandardsManager from "@/components/standards/StandardsManager";

export const metadata: Metadata = { title: "Standards · Tolerancing" };

export default async function StandardsPage() {
  const { organization } = await getCurrentOrg();
  const items = await listLibraryItems(organization.id);
  return (
    <StandardsManager
      orgName={organization.name}
      items={items.map((i) => ({
        id: i.id,
        type: i.type,
        name: i.name,
        data: (i.data ?? {}) as Record<string, string>,
      }))}
    />
  );
}
