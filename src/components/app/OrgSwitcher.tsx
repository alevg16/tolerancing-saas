"use client";

import { switchOrgAction } from "@/app/(app)/org-actions";
import { C, MONO } from "@/lib/design/tokens";

export default function OrgSwitcher({
  orgs,
  currentId,
}: {
  orgs: { id: string; name: string }[];
  currentId: string;
}) {
  // Single workspace → just show the name (no switcher needed).
  if (orgs.length <= 1) {
    return (
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: C.faint,
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {orgs[0]?.name ?? ""}
      </span>
    );
  }

  return (
    <form action={switchOrgAction}>
      <select
        name="orgId"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Switch workspace"
        style={{
          fontFamily: MONO,
          fontSize: 12,
          color: C.ink,
          border: `1px solid ${C.line}`,
          borderRadius: 8,
          padding: "6px 8px",
          background: "#fff",
          maxWidth: 200,
        }}
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </form>
  );
}
