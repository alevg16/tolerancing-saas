import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/dal";
import { previewInvitation } from "@/lib/data/invitations";
import { acceptInviteAction } from "@/app/(app)/org-actions";
import { C, SANS } from "@/lib/design/tokens";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // The Proxy redirects signed-out users to /login?redirectTo=… ; this is a guard.
  const user = await getUser();
  if (!user) redirect(`/login?redirectTo=/invite/${token}`);

  const preview = await previewInvitation(token);
  const ok = Boolean(preview && preview.valid);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        color: C.ink,
        fontFamily: SANS,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          padding: "28px 26px",
          textAlign: "center",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: C.faint,
            marginBottom: 18,
          }}
        >
          Tolerancing
        </div>

        {ok ? (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 650, margin: "0 0 8px" }}>
              Join {preview?.organization_name}
            </h1>
            <p style={{ fontSize: 14, color: C.sub, margin: "0 0 20px" }}>
              You’ve been invited to join this workspace as{" "}
              <b>{preview?.role}</b>.
            </p>
            <form action={acceptInviteAction}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "11px 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  background: C.accent,
                  border: "none",
                  borderRadius: 9,
                  cursor: "pointer",
                }}
              >
                Accept invitation
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 650, margin: "0 0 8px" }}>
              Invitation unavailable
            </h1>
            <p style={{ fontSize: 14, color: C.sub, margin: "0 0 20px" }}>
              This invite link is invalid, expired, or already used.
            </p>
            <a
              href="/dashboard"
              style={{ color: C.accent, fontWeight: 600, fontSize: 14, textDecoration: "none" }}
            >
              Go to your dashboard →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
