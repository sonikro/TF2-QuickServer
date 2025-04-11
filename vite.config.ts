import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"]
  },
})