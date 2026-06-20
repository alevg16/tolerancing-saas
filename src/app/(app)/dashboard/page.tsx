import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentOrg } from "@/lib/auth/dal";
import { listProjects } from "@/lib/data/projects";
import {
  createProjectAction,
  deleteProjectAction,
} from "@/app/(app)/projects/actions";
import { MODULES, getModuleByType } from "@/lib/modules";
import { C, MONO } from "@/lib/design/tokens";

export const metadata: Metadata = { title: "Projects · Tolerancing" };

export default async function DashboardPage() {
  const { organization } = await getCurrentOrg();
  const projects = await listProjects(organization.id);
  const saveable = MODULES.filter((m) => m.saveable);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "30px 22px 56px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 650, margin: 0 }}>Projects</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {saveable.map((m) => (
            <form key={m.type} action={createProjectAction.bind(null, m.type)}>
              <button
                type="submit"
                style={{
                  fontFamily: MONO,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#fff",
                  background: C.accent,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 14px",
                  cursor: "pointer",
                }}
              >
                + New {m.label}
              </button>
            </form>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            background: C.panel,
            border: `1px dashed ${C.line}`,
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center",
            color: C.sub,
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: 15, color: C.ink }}>
            No saved analyses yet.
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Start a stack-up above, or explore the{" "}
            <Link href="/tools" style={{ color: C.accent }}>
              free tools
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {projects.map((p) => {
            const mod = getModuleByType(p.module_type);
            return (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: C.panel,
                  border: `1px solid ${C.line}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <Link
                  href={`/projects/${p.id}`}
                  style={{ textDecoration: "none", color: C.ink, flex: 1, minWidth: 0 }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>
                    {p.name}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: C.faint }}>
                    {mod?.label ?? p.module_type} · updated{" "}
                    {new Date(p.updated_at).toLocaleDateString()}
                  </div>
                </Link>
                <Link
                  href={`/projects/${p.id}`}
                  className="mono"
                  style={{
                    fontSize: 12,
                    color: C.accent,
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: `1px solid ${C.line}`,
                  }}
                >
                  Open
                </Link>
                <Link
                  href={`/report/${p.id}`}
                  className="mono"
                  style={{
                    fontSize: 12,
                    color: C.sub,
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: `1px solid ${C.line}`,
                  }}
                >
                  Export
                </Link>
                <form action={deleteProjectAction.bind(null, p.id)}>
                  <button
                    type="submit"
                    title="Delete"
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: C.faint,
                      background: "transparent",
                      border: `1px solid ${C.line}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
