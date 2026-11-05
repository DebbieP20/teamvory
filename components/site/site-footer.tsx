import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  const { contact } = siteConfig;
  const links = [...siteConfig.nav, ...siteConfig.legal];

  return (
    <footer className="bg-navy text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto]">
        <div>
          <Image src="/brand/teamvory-logo-white.svg" alt="TeamVory" width={157} height={24} />
          <p className="mt-3 max-w-sm text-sm">{siteConfig.tagline}</p>
          {(contact.email || contact.phone) && (
            <p className="mt-4 text-sm">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="hover:text-white">
                  {contact.email}
                </a>
              )}
              {contact.email && contact.phone && " · "}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="hover:text-white">
                  {contact.phone}
                </a>
              )}
            </p>
          )}
        </div>

        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
            {contact.social.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="hover:text-white" rel="noopener noreferrer">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-400 sm:px-6">
          © <CurrentYear /> TeamVory. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// Cached so the page can still be prerendered; refreshed daily.
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
