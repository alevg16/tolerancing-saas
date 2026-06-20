"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { C, MONO, SANS } from "@/lib/design/tokens";
import { STANDARD_KINDS, kindDef, type StandardKind } from "@/lib/standards";
import {
  createStandardAction,
  updateStandardAction,
  deleteStandardAction,
  seedStarterAction,
} from "@/app/(app)/standards/actions";

interface Item {
  id: string;
  type: string;
  name: string;
  data: Record<string, string>;
}

export default function StandardsManager({ orgName, items }: { orgName: string; items: Item[] }) {
  const router = useRouter();
  const [active, setActive] = useState<StandardKind>(STANDARD_KINDS[0].kind);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const def = kindDef(active)!;
  const list = items.filter((i) => i.type === active);

  const reset = () => { setEditingId(null); setName(""); setForm({}); };
  const switchKind = (k: StandardKind) => { setActive(k); reset(); setError(null); };
  const startEdit = (it: Item) => { setEditingId(it.id); setName(it.name); setForm({ ...it.data }); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };
  const run = (fn: () => Promise<void>) => {
    setError(null);
    start(async () => {
      try { await fn(); reset(); router.refresh(); }
      catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    });
  };
  const submit = () => run(() => (editingId ? updateStandardAction(editingId, name, form) : createStandardAction(active, name, form)));

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "30px 22px 56px", fontFamily: SANS, color: C.ink }}>
      <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 6px" }}>Company standards</h1>
      <p style={{ fontSize: 13, color: C.sub, margin: "0 0 20px" }}>
        Shared across <b>{orgName}</b> — the presets, materials and defaults your team standardises on.
        Everyone in the workspace sees the same library.
      </p>

      {/* kind tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {STANDARD_KINDS.map((k) => {
          const on = active === k.kind;
          const count = items.filter((i) => i.type === k.kind).length;
          return (
            <button key={k.kind} onClick={() => switchKind(k.kind)} style={{ fontFamily: SANS, fontSize: 13, fontWeight: on ? 600 : 400, color: on ? "#fff" : C.ink, background: on ? C.accent : C.panel, border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 9, padding: "8px 13px", cursor: "pointer" }}>
              {k.label}{count > 0 && <span style={{ marginLeft: 6, opacity: 0.7, fontFamily: MONO, fontSize: 11 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mono" style={{ fontSize: 12, color: C.fail, background: C.failBg, border: `1px solid ${C.fail}44`, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>{error}</div>
      )}

      {/* add / edit form */}
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ fontSize: 13.5, fontWeight: 650, marginBottom: 4 }}>{editingId ? `Edit ${def.singular}` : `Add a ${def.singular}`}</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>{def.blurb}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12 }}>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. ${def.examples[0]?.name ?? ""}`} style={inp} />
          </Field>
          {def.fields.map((f) => (
            <Field key={f.key} label={f.unit ? `${f.label} (${f.unit})` : f.label}>
              <input value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} inputMode={f.type === "text" ? "text" : "decimal"} style={{ ...inp, fontFamily: f.type === "text" ? SANS : MONO }} />
            </Field>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={submit} disabled={pending || !name.trim()} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "#fff", background: name.trim() ? C.accent : C.faint, border: "none", borderRadius: 8, padding: "9px 16px", cursor: name.trim() ? "pointer" : "default", opacity: pending ? 0.6 : 1 }}>
            {editingId ? "Save changes" : `Add ${def.singular}`}
          </button>
          {editingId && (
            <button onClick={reset} disabled={pending} style={{ fontFamily: SANS, fontSize: 13, color: C.sub, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}>Cancel</button>
          )}
        </div>
      </div>

      {/* list */}
      {list.length === 0 ? (
        <div style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 12, padding: "30px 24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: C.sub }}>No {def.label.toLowerCase()} yet.</p>
          <button onClick={() => run(() => seedStarterAction(active))} disabled={pending} className="mono" style={{ fontSize: 12.5, color: C.accent, background: C.accentBg, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}>
            + Add a starter set
          </button>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((it) => (
            <li key={it.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${editingId === it.id ? C.accent : C.line}`, borderRadius: 12, padding: "13px 16px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{it.name}</div>
                <div className="mono" style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>{def.summary(it.data)}</div>
                {it.data.notes && <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>{it.data.notes}</div>}
              </div>
              <button onClick={() => startEdit(it)} className="mono" style={{ fontSize: 12, color: C.accent, textDecoration: "none", padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", cursor: "pointer" }}>Edit</button>
              <button onClick={() => run(() => deleteStandardAction(it.id))} disabled={pending} className="mono" style={{ fontSize: 12, color: C.faint, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Delete</button>
            </li>
          ))}
        </ul>
      )}

      <p className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 18, lineHeight: 1.6 }}>
        Standards are stored per workspace (org-scoped, Row-Level-Security enforced). Invite teammates from
        Team and everyone shares this one library — your single source of truth for fits, materials and capability.
      </p>
    </div>
  );
}

const inp: React.CSSProperties = { fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", background: "#fff", width: "100%", fontFamily: MONO };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 10.5, color: C.faint, marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}
