"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/lib/design/tokens";

const LINKS = [
  { href: "/dashboard", label: "Projects" },
  { href: "/tools", label: "Tools" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav style={{ display: "flex", gap: 4 }}>
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              padding: "6px 11px",
              borderRadius: 8,
              color: active ? C.accent : C.sub,
              background: active ? C.accentBg : "transparent",
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
