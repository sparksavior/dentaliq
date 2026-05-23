import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/coverage/**",
      ],
    },
  },
});
