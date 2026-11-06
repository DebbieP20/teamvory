import Image from "next/image";
import Link from "next/link";

// Centered card layout for sign-up, log-in and other account pages.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <Link href="/" aria-label="TeamVory home">
        <Image src="/brand/teamvory-logo.svg" alt="TeamVory" width={183} height={28} priority />
      </Link>
      <main id="main" className="mt-8 w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        {children}
      </main>
      <nav aria-label="Footer" className="mt-8 flex gap-5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-navy">Home</Link>
        <Link href="/contact" className="hover:text-navy">Help</Link>
        <Link href="/privacy" className="hover:text-navy">Privacy</Link>
        <Link href="/terms" className="hover:text-navy">Terms</Link>
      </nav>
    </div>
  );
}
