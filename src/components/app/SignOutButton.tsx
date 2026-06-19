"use client";

import { signOut } from "@/app/auth/actions";
import { C, MONO } from "@/lib/design/tokens";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        style={{
          fontFamily: MONO,
          fontSize: 12,
          color: C.sub,
          background: "#fff",
          border: `1px solid ${C.line}`,
          borderRadius: 8,
          padding: "6px 11px",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </form>
  );
}
