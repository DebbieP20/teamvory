"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

export function AppNav({ links }: { links: NavLink[] }) {
  return <AppNavLinks links={links} pathname={usePathname()} />;
}

/** The links themselves; without a pathname nothing is highlighted (used while loading). */
export function AppNavLinks({ links, pathname }: { links: NavLink[]; pathname?: string }) {
  return (
    <nav aria-label="App" className="flex gap-1 overflow-x-auto">
      {links.map((link) => {
        // Sections are active on their sub-pages too (e.g. /employee/availability/week).
        const isHome = links[0]?.href === link.href;
        const active =
          !!pathname && (isHome ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`));
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap text-navy/70 hover:bg-slate-100 hover:text-navy",
              active && "bg-mint text-teal-dark hover:bg-mint hover:text-teal-dark",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
