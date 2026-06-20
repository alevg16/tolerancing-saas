"use client";

import { useState, useTransition } from "react";
import { C, MONO, SANS } from "@/lib/design/tokens";
import { setModuleTier } from "@/app/(app)/settings/modules/actions";
import type { ModuleType } from "@/lib/types";

interface Row {
  slug: string;
  type: ModuleType;
  label: string;
  standard: string;
  tier: "free" | "pro";
  saveable: boolean;
}

export default function ModuleTierTable({ modules }: { modules: Row[] }) {
  const [rows, setRows] = useState(modules);
  const [pendingType, setPendingType] = useState<ModuleType | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const setTier = (type: ModuleType, tier: "free" | "pro") => {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.type === type ? { ...r, tier } : r)));
    setPendingType(type);
    setError(null);
    startTransition(async () => {
      try {
        await setModuleTier(type, tier);
      } catch (e) {
        setRows(prev); // roll back on failure
        setError(e instanceof Error ? e.message : "Failed to save");
      } finally {
        setPendingType(null);
      }
    });
  };

  const freeCount = rows.filter((r) => r.tier === "free").length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "30px 22px 56px", fontFamily: SANS, color: C.ink }}>
      <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 6px" }}>Module tiers</h1>
      <p style={{ fontSize: 13, color: C.sub, margin: "0 0 20px" }}>
        Choose which calculators are free (the hook) and which need a Pro plan. Changes apply immediately
        across Tools and saved projects. {freeCount} of {rows.length} free.
      </p>

      {error && (
        <div className="mono" style={{ fontSize: 12, color: C.fail, background: C.failBg, border: `1px solid ${C.fail}44`, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div
            key={r.type}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 16px",
              borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
              opacity: pendingType === r.type ? 0.6 : 1,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.label}</div>
              <div className="mono" style={{ fontSize: 10.5, color: C.faint }}>
                {r.standard} · /tools/{r.slug}
              </div>
            </div>
            <div
              className="mono"
              style={{ display: "inline-flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.line}` }}
            >
              {(["free", "pro"] as const).map((t) => {
                const on = r.tier === t;
                const color = t === "free" ? C.ok : C.accent;
                return (
                  <button
                    key={t}
                    onClick={() => !on && setTier(r.type, t)}
                    disabled={pendingType === r.type}
                    style={{
                      fontFamily: MONO,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                      padding: "7px 16px",
                      border: "none",
                      cursor: on ? "default" : "pointer",
                      background: on ? color : "#fff",
                      color: on ? "#fff" : C.faint,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 14, lineHeight: 1.6 }}>
        Gating is enforced server-side from this setting plus the customer&apos;s synced plan — the client is
        never trusted. Free modules are reachable by everyone; Pro modules show the upgrade wall to free orgs.
      </p>
    </div>
  );
}
