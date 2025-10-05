import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ["tests/setup.ts"],
  },
})