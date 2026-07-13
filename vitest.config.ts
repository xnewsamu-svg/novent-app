import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/automation/**/*.ts",
        "src/lib/**/*.ts",
      ],
      exclude: [
        "src/automation/index.ts",
        "src/automation/**/*.test.ts",
      ],
      reporter: ["text", "lcov"],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "@/src": path.resolve(__dirname, "src"),
    },
  },
})
