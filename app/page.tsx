import Image from "next/image";

// Placeholder until the public website is built in M1.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-navy px-6 py-24 text-center text-white">
      <Image
        src="/brand/teamvory-logo-white.svg"
        alt="TeamVory"
        width={320}
        height={49}
        priority
      />
      <h1 className="mt-10 max-w-2xl text-3xl sm:text-4xl">
        Your team, perfectly organized.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-300">
        Employee scheduling for small, medium and seasonal businesses. Your
        staff enter their availability once, and you get a fair weekly
        schedule in minutes.
      </p>
      <p className="mt-10 rounded-full bg-teal px-5 py-2 text-sm font-semibold text-navy">
        Coming soon
      </p>
    </main>
  );
}
