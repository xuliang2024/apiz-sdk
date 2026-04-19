import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    environment: "node",
    globals: false,
    testTimeout: 120_000,
    hookTimeout: 30_000,
  },
});
