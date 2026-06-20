import { getUser, getCurrentOrg, getMyOrgs } from "@/lib/auth/dal";
import { isAppAdmin } from "@/lib/auth/admin";
import AppShell from "@/components/app/AppShell";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getCurrentOrg() calls requireUser() → redirects to /login if signed out.
  const [user, { organization }, orgs, admin] = await Promise.all([
    getUser(),
    getCurrentOrg(),
    getMyOrgs(),
    isAppAdmin(),
  ]);

  return (
    <AppShell
      orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}
      currentOrgId={organization.id}
      userEmail={user?.email ?? ""}
      isAdmin={admin}
    >
      {children}
    </AppShell>
  );
}
