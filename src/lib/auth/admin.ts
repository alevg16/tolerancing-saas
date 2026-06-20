import "server-only";

import { getUser } from "@/lib/auth/dal";

/**
 * App-owner gate for product-wide settings (e.g. which modules are free/pro).
 * The owner emails come from APP_ADMIN_EMAILS (comma-separated). This is a
 * product-level role distinct from per-organization membership roles, so a
 * customer's org owner can never change the global pricing config.
 */
export function adminEmails(): string[] {
  return (process.env.APP_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAppAdmin(): Promise<boolean> {
  const list = adminEmails();
  if (list.length === 0) return false;
  const user = await getUser();
  const email = user?.email?.toLowerCase();
  return !!email && list.includes(email);
}
