// Everything about the public site that may change without touching page code.

export const siteConfig = {
  name: "TeamVory",
  tagline: "Your team, perfectly organized.",
  description:
    "Employee scheduling for small, medium and seasonal businesses. Staff enter their availability once, and you get a fair weekly schedule in minutes.",

  nav: [
    { href: "/how-it-works", label: "How it works" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],

  legal: [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ],

  // Public contact details. On hold until the owner has created them
  // (technical plan, section 7). Anything left null is simply not shown.
  contact: {
    email: null as string | null,
    phone: null as string | null,
    social: [] as { label: string; href: string }[],
  },
} as const;
