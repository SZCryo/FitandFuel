"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/diary", label: "Diary" },
  { href: "/meal-plan", label: "Meal Plan" },
  { href: "/workout", label: "Workout" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="tabs" aria-label="Primary">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link key={link.href} href={link.href} className={active ? "active" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
