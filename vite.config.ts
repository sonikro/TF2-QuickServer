import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Resolves the `@/*` path alias (packages/web/tsconfig.json) for the
      // web workspace tests; only web source uses the bare `@` alias.
      "@": fileURLToPath(new URL("./packages/web/src", import.meta.url)),
    },
  },
  test: {
    globals: false,
    setupFiles: ["tests/setup.ts"],
  },
});
