import type { NextConfig } from "next";

// Sent with every page (see docs/launch-checklist.md, "Security").
const securityHeaders = [
  // No other site may show TeamVory in a frame (clickjacking); forms only post back to us.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Browsers ignore this over plain http (local development); online it keeps people on https.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Native image libraries for the PNG/JPG exports: load them with Node, don't bundle them.
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  // The image export reads the brand font from disk: ship it with that route.
  outputFileTracingIncludes: {
    "/api/exports/[format]": ["./node_modules/@fontsource/dm-sans/files/dm-sans-latin-{400,700}-normal.woff"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
