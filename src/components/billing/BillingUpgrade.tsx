"use client";

import { useState } from "react";
import { startCheckoutAction } from "@/app/(app)/billing/actions";
import { C, MONO } from "@/lib/design/tokens";

interface PriceInfo {
  interval: "month" | "year";
  amount: number;
  currency: string;
}

export default function BillingUpgrade({
  month,
  year,
}: {
  month: PriceInfo | null;
  year: PriceInfo | null;
}) {
  const hasBoth = !!month && !!year;
  const [interval, setInterval] = useState<"month" | "year">(
    month ? "month" : "year",
  );
  const chosen = interval === "year" ? year : month;

  const savePct =
    month && year && month.amount > 0
      ? Math.round((1 - year.amount / (month.amount * 12)) * 100)
      : 0;

  return (
    <div>
      {hasBoth && (
        <div
          className="mono"
          style={{
            display: "inline-flex",
            border: `1px solid ${C.line}`,
            borderRadius: 9,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          {(["month", "year"] as const).map((iv) => {
            const on = interval === iv;
            return (
              <button
                key={iv}
                type="button"
                onClick={() => setInterval(iv)}
                style={{
                  padding: "8px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: on ? C.accent : "#fff",
                  color: on ? "#fff" : C.sub,
                }}
              >
                {iv === "month" ? "Monthly" : "Annual"}
                {iv === "year" && savePct > 0 && (
                  <span style={{ opacity: on ? 0.85 : 1, marginLeft: 6 }}>
                    save {savePct}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {chosen && (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="mono" style={{ fontSize: 28, fontWeight: 700, color: C.ink }}>
            {chosen.currency} {chosen.amount}
          </span>
          <span style={{ fontSize: 13, color: C.faint }}>
            / {chosen.interval === "year" ? "year" : "month"}
            {chosen.interval === "year" && " · whole workspace"}
            {chosen.interval === "month" && " · whole workspace"}
          </span>
        </div>
      )}

      <form action={startCheckoutAction}>
        <input type="hidden" name="interval" value={interval} />
        <button
          type="submit"
          style={{
            fontFamily: MONO,
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            background: C.accent,
            border: "none",
            borderRadius: 9,
            padding: "11px 18px",
            cursor: "pointer",
          }}
        >
          Upgrade to Pro
        </button>
      </form>
    </div>
  );
}
