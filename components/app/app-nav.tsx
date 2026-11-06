"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="App" className="flex gap-1 overflow-x-auto">
      {links.map((link) => {
        const active = pathname === link.href;
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
