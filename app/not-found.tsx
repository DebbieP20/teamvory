import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Link href="/" aria-label="TeamVory home">
        <Image src="/brand/teamvory-logo.svg" alt="TeamVory" width={196} height={30} />
      </Link>
      <h1 className="mt-10 text-3xl">Page not found</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Button asChild size="lg" className="mt-8 h-11 px-6 font-semibold">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
