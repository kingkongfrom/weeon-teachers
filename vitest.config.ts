import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths({ projects: [resolve(root, "tsconfig.json")] }), react()],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // QA-8: floor set where the suite is (baseline 11 Oct: lines 0.77 · branches
      // 61.1 · funcs 54.6); ratchet up as tests land, scoping high bars to
      // grading/calendar pure modules.
      thresholds: { lines: 0.5, functions: 50, branches: 55 },
    },
  },
});
