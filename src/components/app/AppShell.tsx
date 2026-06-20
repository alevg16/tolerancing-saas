import Link from "next/link";
import NavLinks from "./NavLinks";
import SignOutButton from "./SignOutButton";
import OrgSwitcher from "./OrgSwitcher";
import { C, SANS } from "@/lib/design/tokens";

export default function AppShell({
  orgs,
  currentOrgId,
  userEmail,
  children,
}: {
  orgs: { id: string; name: string }[];
  currentOrgId: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: SANS }}>
      <header
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 22px",
          background: C.panel,
          borderBottom: `1px solid ${C.line}`,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/dashboard"
          className="mono"
          style={{
            fontSize: 12,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: C.ink,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Tolerancing
        </Link>
        <NavLinks />
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <OrgSwitcher orgs={orgs} currentId={currentOrgId} />
          {userEmail && (
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: C.faint,
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userEmail}
            </span>
          )}
        </div>
        <SignOutButton />
      </header>
      <main>{children}</main>
    </div>
  );
}
