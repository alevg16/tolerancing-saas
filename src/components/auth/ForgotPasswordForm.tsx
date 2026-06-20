"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import type { AuthState } from "@/app/auth/types";
import { C, MONO, SANS } from "@/lib/design/tokens";

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    {} as AuthState,
  );

  return (
    <div style={wrap}>
      <Link href="/" className="mono" style={brand}>
        Tolerancing
      </Link>
      <div style={card}>
        <h1 style={{ fontSize: 19, fontWeight: 650, margin: "0 0 6px" }}>
          Reset your password
        </h1>
        <p style={{ fontSize: 13, color: C.sub, margin: "0 0 18px", lineHeight: 1.5 }}>
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>

        <form action={action}>
          <label style={{ display: "block", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 6 }}>Email</div>
            <input name="email" type="email" required style={input} />
          </label>

          {state.error && <Note color={C.fail} bg={C.failBg}>{state.error}</Note>}
          {state.message && <Note color={C.ok} bg={C.okBg}>{state.message}</Note>}

          <button type="submit" disabled={pending} style={{ ...submit, opacity: pending ? 0.65 : 1 }}>
            {pending ? "…" : "Send reset link"}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/login" className="mono" style={{ fontSize: 12, color: C.sub, textDecoration: "none" }}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  background: C.paper,
  color: C.ink,
  fontFamily: SANS,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};
const brand: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: C.faint,
  textDecoration: "none",
  marginBottom: 22,
};
const card: React.CSSProperties = {
  width: "min(400px, 100%)",
  background: C.panel,
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  padding: "26px 26px 28px",
};
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
const submit: React.CSSProperties = {
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
};

function Note({
  color,
  bg,
  children,
}: {
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className="mono"
      style={{
        fontSize: 12,
        color,
        background: bg,
        border: `1px solid ${color}33`,
        borderRadius: 8,
        padding: "8px 10px",
        margin: "2px 0 14px",
        lineHeight: 1.5,
      }}
    >
      {children}
    </p>
  );
}
