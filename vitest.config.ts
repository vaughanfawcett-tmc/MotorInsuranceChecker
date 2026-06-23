import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Pure-logic and service tests only; the dashboard is exercised manually.
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
