import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    // In Next.js an imported image is { src, width, height }, which next/image expects.
    {
      name: "static-images",
      enforce: "pre",
      load(id) {
        if (/\.(png|jpe?g|webp|avif)$/.test(id)) return `export default ${JSON.stringify({ src: id, width: 100, height: 100 })};`;
      },
    },
  ],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "e2e/**"],
  },
});
