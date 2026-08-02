import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Resolves the `@/*` path alias (packages/web/tsconfig.json) for the
      // web workspace tests; only web source uses the bare `@` alias.
      "@": path.resolve(__dirname, "packages/web/src"),
    },
  },
  test: {
    globals: false,
    setupFiles: ["tests/setup.ts"],
  },
});