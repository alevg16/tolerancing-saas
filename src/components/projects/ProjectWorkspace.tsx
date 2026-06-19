"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { CALCULATORS } from "@/components/calculators";
import { useHydrated } from "@/lib/use-hydrated";
import { updateProjectAction } from "@/app/(app)/projects/actions";
import type { Project } from "@/lib/types";
import { C, MONO, SANS } from "@/lib/design/tokens";

export default function ProjectWorkspace({
  project,
  moduleLabel,
}: {
  project: Project;
  moduleLabel: string;
}) {
  const Calc = CALCULATORS[project.module_type];

  const [name, setName] = useState(project.name);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Client-only render — the stack-up module is non-deterministic at render.
  const hydrated = useHydrated();

  // Latest serializable module state, kept in a ref so re-renders don't churn.
  const stateRef = useRef<Record<string, unknown>>(project.data ?? {});
  const initialReportSeen = useRef(false);

  const onStateChange = useCallback((s: Record<string, unknown>) => {
    stateRef.current = s;
    // Ignore the first report (the module echoing its hydrated state on mount).
    if (!initialReportSeen.current) {
      initialReportSeen.current = true;
      return;
    }
    setDirty(true);
    setSavedAt(null);
  }, []);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateProjectAction(project.id, {
        name: name.trim() || moduleLabel,
        data: stateRef.current,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString());
    });
  };

  const status = error
    ? { text: error, color: C.fail }
    : pending
      ? { text: "Saving…", color: C.faint }
      : dirty
        ? { text: "Unsaved changes", color: C.warn }
        : savedAt
          ? { text: `Saved ${savedAt}`, color: C.ok }
          : { text: "Saved", color: C.faint };

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 22px",
          background: C.panel,
          borderBottom: `1px solid ${C.line}`,
          fontFamily: SANS,
        }}
        className="no-print"
      >
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          aria-label="Project name"
          style={{
            fontFamily: SANS,
            fontSize: 15,
            fontWeight: 650,
            color: C.ink,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            padding: "7px 11px",
            background: "#fff",
            outline: "none",
            width: "min(320px, 60vw)",
          }}
        />
        <span
          className="mono"
          style={{ fontSize: 11, color: C.faint, letterSpacing: ".06em" }}
        >
          {moduleLabel}
        </span>
        <span style={{ flex: 1 }} />
        <span
          className="mono"
          style={{ fontSize: 11.5, color: status.color }}
        >
          {status.text}
        </span>
        <button
          onClick={save}
          disabled={pending}
          style={{
            fontFamily: MONO,
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: C.accent,
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.65 : 1,
          }}
        >
          Save
        </button>
      </div>

      {hydrated ? (
        <Calc initialState={project.data} onStateChange={onStateChange} />
      ) : (
        <div style={{ minHeight: "60vh" }} />
      )}
    </div>
  );
}
