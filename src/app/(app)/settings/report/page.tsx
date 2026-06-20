import type { Metadata } from "next";
import { getCurrentOrg } from "@/lib/auth/dal";
import { getReportSettings } from "@/lib/data/reportSettings";
import ReportBrandingForm from "@/components/settings/ReportBrandingForm";

export const metadata: Metadata = { title: "Report branding · Tolerancing" };

export default async function ReportSettingsPage() {
  const { organization } = await getCurrentOrg();
  const settings = await getReportSettings(organization.id);
  return <ReportBrandingForm orgName={organization.name} initial={settings} />;
}
