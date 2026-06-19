import { getUser, getCurrentOrg } from "@/lib/auth/dal";
import AppShell from "@/components/app/AppShell";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getCurrentOrg() calls requireUser() → redirects to /login if signed out.
  const [user, { organization }] = await Promise.all([
    getUser(),
    getCurrentOrg(),
  ]);

  return (
    <AppShell orgName={organization.name} userEmail={user?.email ?? ""}>
      {children}
    </AppShell>
  );
}
