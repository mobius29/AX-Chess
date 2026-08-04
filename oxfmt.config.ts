import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 120,
  ignorePatterns: [".next/**", "dist/**", "node_modules/**", "out/**"],
  sortImports: true,
  sortTailwindcss: true,
});
