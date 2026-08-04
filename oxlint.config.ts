import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "unicorn", "import", "react", "jsx-a11y", "nextjs", "jest"],
  categories: {
    correctness: "error",
    suspicious: "error",
    perf: "warn",
  },
  rules: {
    "typescript/no-explicit-any": "off",
    "typescript/no-extraneous-class": ["error", { allowWithDecorator: true }],
    "react/react-in-jsx-scope": "off",
    "import/no-unassigned-import": "off",
  },
  ignorePatterns: ["dist", ".next", "node_modules", "next-env.d.ts", "coverage"],
  overrides: [
    {
      files: ["apps/api/**/*.ts"],
      env: { node: true, jest: true },
    },
    {
      files: ["apps/web/**/*.{ts,tsx}"],
      env: { browser: true },
    },
  ],
});
