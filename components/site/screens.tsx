import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

// Frames for app screenshots on the marketing pages (made with `npm run screenshots`).

/** A laptop screen: the screenshot under a simple browser bar. */
export function BrowserFrame({ image, alt, sizes, className }: { image: StaticImageData; alt: string; sizes: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-white shadow-xl shadow-navy/10", className)}>
      <div aria-hidden className="flex gap-1.5 border-b bg-slate-50 px-3 py-2">
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="size-2.5 rounded-full bg-slate-300" />
      </div>
      <Image src={image} alt={alt} sizes={sizes} className="h-auto w-full" />
    </div>
  );
}

/** A phone screen with a navy edge. */
export function PhoneFrame({ image, alt, sizes }: { image: StaticImageData; alt: string; sizes: string }) {
  return (
    <div className="rounded-[2rem] bg-navy p-1.5 shadow-xl shadow-navy/20">
      <Image src={image} alt={alt} sizes={sizes} className="h-auto w-full rounded-[1.6rem]" />
    </div>
  );
}
