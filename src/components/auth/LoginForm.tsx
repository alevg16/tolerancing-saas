"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp } from "@/app/auth/actions";
import type { AuthState } from "@/app/auth/types";
import { C, MONO, SANS } from "@/lib/design/tokens";

const empty: AuthState = {};

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [inState, inAction, inPending] = useActionState(signIn, empty);
  const [upState, upAction, upPending] = useActionState(signUp, empty);

  const isSignup = mode === "signup";
  const state = isSignup ? upState : inState;
  const action = isSignup ? upAction : inAction;
  const pending = isSignup ? upPending : inPending;
  const error = state.error ?? initialError;

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
      <Link
        href="/"
        className="mono"
        style={{
          fontSize: 12,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: C.faint,
          textDecoration: "none",
          marginBottom: 22,
        }}
      >
        Tolerancing
      </Link>

      <div
        style={{
          width: "min(400px, 100%)",
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          padding: "26px 26px 28px",
        }}
      >
        <div style={{ display: "flex", gap: 4, marginBottom: 22 }}>
          {(["signin", "signup"] as const).map((m) => {
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: 8,
                  border: `1px solid ${on ? C.accent : C.line}`,
                  background: on ? C.accentBg : "#fff",
                  color: on ? C.accent : C.sub,
                }}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            );
          })}
        </div>

        {/* key forces fresh inputs when switching modes */}
        <form action={action} key={mode}>
          {isSignup && (
            <Field label="Name">
              <input name="name" autoComplete="name" style={input} />
            </Field>
          )}
          <Field label="Email">
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              style={input}
            />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
              style={input}
            />
          </Field>

          {error && (
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
              {error}
            </p>
          )}
          {state.message && (
            <p
              className="mono"
              style={{
                fontSize: 12,
                color: C.ok,
                background: C.okBg,
                border: `1px solid ${C.ok}33`,
                borderRadius: 8,
                padding: "8px 10px",
                margin: "2px 0 14px",
              }}
            >
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "11px 0",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: C.accent,
              border: "none",
              borderRadius: 9,
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.65 : 1,
            }}
          >
            {pending
              ? "…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      </div>

      <p
        style={{
          fontSize: 12,
          color: C.faint,
          marginTop: 18,
          fontFamily: MONO,
          textAlign: "center",
          maxWidth: 360,
          lineHeight: 1.6,
        }}
      >
        {isSignup
          ? "Free account — includes the ISO 286 fit calculator."
          : "Engineering tolerance analysis for mechanical teams."}
      </p>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.faint, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </label>
  );
}
