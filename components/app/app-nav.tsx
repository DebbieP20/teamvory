"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

export function AppNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  // On a phone the row scrolls sideways: keep the current page's link in view.
  useEffect(() => {
    ref.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return <AppNavLinks links={links} pathname={pathname} navRef={ref} />;
}

/** The links themselves; without a pathname nothing is highlighted (used while loading). */
export function AppNavLinks({ links, pathname, navRef }: { links: NavLink[]; pathname?: string; navRef?: React.Ref<HTMLElement> }) {
  return (
    <nav
      ref={navRef}
      aria-label="App"
      className="flex [scrollbar-width:none] gap-1 overflow-x-auto px-3 sm:px-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
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
