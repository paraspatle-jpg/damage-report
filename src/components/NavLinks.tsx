"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/allocation", label: "Allocation" },
  { href: "/rebalance", label: "Rebalance" },
  { href: "/decision", label: "Decision" },
  { href: "/scanner", label: "Scanner" },
  { href: "/sip", label: "SIP" },
  { href: "/expenses", label: "Expenses" },
  { href: "/journal", label: "Journal" },
  { href: "/settings/keys", label: "Keys" },
];

export function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();

  if (pathname === "/login") return null;

  function onLogout() {
    start(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {nav.map((n) => {
        const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} className="nav-link" data-active={active}>
            {n.label}
          </Link>
        );
      })}
      <button
        onClick={onLogout}
        className="nav-link"
        disabled={pending}
        title="Sign out"
      >
        {pending ? "…" : "Logout"}
      </button>
    </nav>
  );
}
