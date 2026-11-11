import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AppNav, AppNavLinks } from "./app-nav";
import { UserMenu } from "./user-menu";

/**
 * Frame for the signed-in areas. The frame itself is static, so it shows
 * instantly; the parts that need the session (user menu, page content)
 * stream in behind Suspense boundaries.
 */
export function AppShell({
  home,
  links,
  children,
}: {
  home: string;
  links: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <header className="border-b bg-white">
        {/* On phones the menu gets its own row below the logo, so every link fits. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:h-16 sm:flex-nowrap sm:py-0 sm:px-6">
          <Link href={home} aria-label="TeamVory dashboard" className="shrink-0">
            <Image src="/brand/teamvory-icon.svg" alt="TeamVory" width={32} height={32} className="sm:hidden" />
            <Image src="/brand/teamvory-logo.svg" alt="TeamVory" width={157} height={24} className="hidden sm:block" />
          </Link>
          {/* The highlighted link depends on the URL, so it fills in after the static frame. */}
          <div className="order-last -mx-1 w-full sm:order-none sm:mx-0 sm:w-auto">
            <Suspense fallback={<AppNavLinks links={links} />}>
              <AppNav links={links} />
            </Suspense>
          </div>
          <div className="ml-auto">
            <Suspense fallback={<div className="h-8 w-24 animate-pulse rounded bg-slate-100" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
