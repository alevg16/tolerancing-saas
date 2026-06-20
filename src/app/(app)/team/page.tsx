import type { Metadata } from "next";
import { getCurrentOrg } from "@/lib/auth/dal";
import { getMembers } from "@/lib/data/team";
import { listInvitations } from "@/lib/data/invitations";
import {
  renameWorkspaceAction,
  changeRoleAction,
  removeMemberAction,
  createInviteAction,
  revokeInviteAction,
} from "./actions";
import CopyLink from "@/components/team/CopyLink";
import { C, MONO } from "@/lib/design/tokens";
import type { Role } from "@/lib/types";

export const metadata: Metadata = { title: "Team · Tolerancing" };

const ROLE_BADGE: Record<Role, { c: string; bg: string }> = {
  owner: { c: C.accent, bg: C.accentBg },
  admin: { c: C.ok, bg: C.okBg },
  member: { c: C.sub, bg: C.paper },
};

export default async function TeamPage() {
  const { organization, membership } = await getCurrentOrg();
  const members = await getMembers(organization.id);
  const canManage = membership.role === "owner" || membership.role === "admin";
  const myId = membership.user_id;
  const invites = canManage ? await listInvitations(organization.id) : [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "30px 22px 56px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 4px" }}>Team</h1>
      <p style={{ fontSize: 13, color: C.sub, margin: "0 0 22px" }}>
        Everyone here shares this workspace&apos;s saved projects and standards
        library.
      </p>

      {/* Workspace name */}
      <section
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: "16px 18px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 12 }}>
          Workspace
        </div>
        {canManage ? (
          <form
            action={renameWorkspaceAction}
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <input
              name="name"
              defaultValue={organization.name}
              aria-label="Workspace name"
              style={{
                flex: 1,
                minWidth: 200,
                fontFamily: MONO,
                fontSize: 14,
                color: C.ink,
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                padding: "9px 11px",
                background: "#fff",
                outline: "none",
              }}
            />
            <button type="submit" style={primaryBtn}>
              Rename
            </button>
          </form>
        ) : (
          <div className="mono" style={{ fontSize: 14, color: C.ink }}>
            {organization.name}
          </div>
        )}
      </section>

      {/* Members */}
      <section
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: "16px 18px 8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 650 }}>
            Members{" "}
            <span className="mono" style={{ color: C.faint, fontWeight: 400 }}>
              ({members.length})
            </span>
          </div>
        </div>

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {members.map((m) => {
            const isMe = m.user.id === myId;
            const badge = ROLE_BADGE[m.role];
            return (
              <li
                key={m.membership_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderTop: `1px solid ${C.line}`,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 14, color: C.ink, fontWeight: 550 }}>
                    {m.user.name || m.user.email || "Unknown"}
                    {isMe && (
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: C.faint, marginLeft: 8 }}
                      >
                        you
                      </span>
                    )}
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: C.faint }}>
                    {m.user.email}
                  </div>
                </div>

                {canManage && !isMe ? (
                  <form
                    action={changeRoleAction}
                    style={{ display: "flex", gap: 6, alignItems: "center" }}
                  >
                    <input type="hidden" name="userId" value={m.user.id} />
                    <select
                      name="role"
                      defaultValue={m.role}
                      style={{
                        fontFamily: MONO,
                        fontSize: 12.5,
                        color: C.ink,
                        border: `1px solid ${C.line}`,
                        borderRadius: 7,
                        padding: "6px 8px",
                        background: "#fff",
                      }}
                    >
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                    </select>
                    <button type="submit" style={ghostBtn}>
                      Update
                    </button>
                  </form>
                ) : (
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: ".04em",
                      color: badge.c,
                      background: badge.bg,
                      border: `1px solid ${badge.c}33`,
                      borderRadius: 6,
                      padding: "4px 9px",
                    }}
                  >
                    {m.role}
                  </span>
                )}

                {canManage && !isMe && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="userId" value={m.user.id} />
                    <button type="submit" style={ghostBtn} title="Remove">
                      Remove
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>

      </section>

      {canManage && (
        <section
          style={{
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: "16px 18px 18px",
            marginTop: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 4 }}>
            Invite teammates
          </div>
          <p style={{ fontSize: 12.5, color: C.sub, margin: "0 0 12px" }}>
            Create a link and send it to someone — they join this workspace when
            they open it and sign in. Each link works once.
          </p>

          <form
            action={createInviteAction}
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: invites.length ? 16 : 0,
            }}
          >
            <input
              name="email"
              type="email"
              placeholder="name@company.com (optional)"
              style={{
                flex: 1,
                minWidth: 200,
                fontFamily: MONO,
                fontSize: 13,
                color: C.ink,
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                padding: "9px 11px",
                background: "#fff",
                outline: "none",
              }}
            />
            <select
              name="role"
              defaultValue="member"
              style={{
                fontFamily: MONO,
                fontSize: 12.5,
                color: C.ink,
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                padding: "9px 8px",
                background: "#fff",
              }}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit" style={primaryBtn}>
              Create link
            </button>
          </form>

          {invites.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                    borderTop: `1px solid ${C.line}`,
                    paddingTop: 10,
                  }}
                >
                  <CopyLink url={`${siteUrl}/invite/${inv.token}`} />
                  <span className="mono" style={{ fontSize: 11, color: C.faint }}>
                    {inv.role}
                    {inv.email ? ` · ${inv.email}` : ""}
                  </span>
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="inviteId" value={inv.id} />
                    <button type="submit" style={ghostBtn}>
                      Revoke
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  background: C.accent,
  border: "none",
  borderRadius: 8,
  padding: "9px 16px",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 12,
  color: C.sub,
  background: "#fff",
  border: `1px solid ${C.line}`,
  borderRadius: 7,
  padding: "6px 10px",
  cursor: "pointer",
};
