import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Per-organization report branding, stored as a singleton library_items row
 * (type = "report_settings"). Reuses the org-scoped RLS — no new table.
 */

const TYPE = "report_settings";

export interface ReportSettings {
  companyName: string;
  logoUrl: string;
  footer: string;
}

const DEFAULTS: ReportSettings = { companyName: "", logoUrl: "", footer: "" };

export async function getReportSettings(organizationId: string): Promise<ReportSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("library_items")
    .select("data")
    .eq("organization_id", organizationId)
    .eq("type", TYPE)
    .maybeSingle();
  return { ...DEFAULTS, ...((data?.data ?? {}) as Partial<ReportSettings>) };
}

export async function saveReportSettings(
  organizationId: string,
  createdBy: string,
  settings: ReportSettings,
): Promise<void> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("library_items")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("type", TYPE)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("library_items").update({ data: settings }).eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("library_items").insert({
    organization_id: organizationId,
    created_by: createdBy,
    type: TYPE,
    name: "Report branding",
    data: settings,
  });
  if (!error) return;

  // A concurrent save beat us to the insert; the partial unique index
  // (library_items_report_settings_uniq) rejects the duplicate — converge by
  // updating the row that now exists instead of surfacing the conflict.
  if (error.code === "23505") {
    const { data: row } = await supabase
      .from("library_items")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("type", TYPE)
      .maybeSingle();
    if (row) {
      const { error: updateError } = await supabase
        .from("library_items")
        .update({ data: settings })
        .eq("id", row.id);
      if (updateError) throw updateError;
      return;
    }
  }
  throw error;
}
