import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // The engine, rulepack and report renderers are pure and run in plain Node.
    // A DOM environment is only introduced when component tests arrive (phase 4).
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    globals: false,
    // Database-backed tests share one SQLite file, so they must not race.
    fileParallelism: false,
  },
});
