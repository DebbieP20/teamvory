"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Close the phone menu when the page changes (adjusting state during render).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="TeamVory home">
          <Image src="/brand/teamvory-logo.svg" alt="TeamVory" width={157} height={24} priority />
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          {siteConfig.nav.map((item) => (
            <NavLink key={item.href} href={item.href} active={pathname === item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:ml-0 md:flex">
          <Button asChild variant="ghost" size="lg">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="lg" className="font-semibold">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon-lg"
          className="ml-auto md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <XIcon /> : <MenuIcon />}
        </Button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t bg-white px-4 pb-4 md:hidden">
          <ul className="flex flex-col py-2">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} active={pathname === item.href} className="block py-3 text-base">
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="lg" className="font-semibold">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium text-navy/80 transition-colors hover:text-teal-dark",
        active && "text-teal-dark",
        className,
      )}
    >
      {children}
    </Link>
  );
}
