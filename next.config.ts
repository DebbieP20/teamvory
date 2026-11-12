import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
