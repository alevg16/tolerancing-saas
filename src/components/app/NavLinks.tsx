"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/lib/design/tokens";

const LINKS = [
  { href: "/dashboard", label: "Projects" },
  { href: "/tools", label: "Tools" },
  { href: "/team", label: "Team" },
  { href: "/billing", label: "Billing" },
];

export default function NavLinks({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/settings/modules", label: "Settings" }] : LINKS;
  return (
    <nav style={{ display: "flex", gap: 4 }}>
      {links.map((l) => {
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
