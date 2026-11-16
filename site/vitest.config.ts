import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts", "test/dom/**/*.test.ts"], // dom files opt into jsdom per file
    environment: "node",
    coverage: { provider: "v8", include: ["src/lib/**"], reporter: ["text", "json-summary"] },
  },
});
