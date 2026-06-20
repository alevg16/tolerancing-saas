"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrg, requireUser } from "@/lib/auth/dal";
import { saveReportSettings, type ReportSettings } from "@/lib/data/reportSettings";

export async function saveReportBrandingAction(settings: ReportSettings) {
  const user = await requireUser();
  const { organization } = await getCurrentOrg();
  await saveReportSettings(organization.id, user.id, {
    companyName: (settings.companyName ?? "").trim(),
    logoUrl: (settings.logoUrl ?? "").trim(),
    footer: (settings.footer ?? "").trim(),
  });
  revalidatePath("/settings/report");
}
