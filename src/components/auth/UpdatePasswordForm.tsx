"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "@/app/auth/actions";
import type { AuthState } from "@/app/auth/types";
import { C, MONO, SANS } from "@/lib/design/tokens";

export default function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    {} as AuthState,
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        color: C.ink,
        fontFamily: SANS,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 12,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: C.faint,
          marginBottom: 22,
        }}
      >
        Tolerancing
      </span>
      <div
        style={{
          width: "min(400px, 100%)",
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          padding: "26px 26px 28px",
        }}
      >
        <h1 style={{ fontSize: 19, fontWeight: 650, margin: "0 0 6px" }}>
          Set a new password
        </h1>
        <p style={{ fontSize: 13, color: C.sub, margin: "0 0 18px" }}>
          Choose a password of at least 8 characters.
        </p>

        <form action={action}>
          <Field label="New password">
            <input name="password" type="password" autoComplete="new-password" required minLength={8} style={input} />
          </Field>
          <Field label="Confirm password">
            <input name="confirm" type="password" autoComplete="new-password" required minLength={8} style={input} />
          </Field>

          {state.error && (
            <p
              className="mono"
              style={{
                fontSize: 12,
                color: C.fail,
                background: C.failBg,
                border: `1px solid ${C.fail}33`,
                borderRadius: 8,
                padding: "8px 10px",
                margin: "2px 0 14px",
              }}
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "11px 0",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: C.accent,
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              opacity: pending ? 0.65 : 1,
            }}
          >
            {pending ? "…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  fontFamily: MONO,
  fontSize: 14,
  color: C.ink,
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  padding: "10px 11px",
  background: "#fff",
  outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.faint, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}
