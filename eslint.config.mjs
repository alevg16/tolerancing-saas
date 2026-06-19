import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The calculator components are ported in as-is (their math runs a Monte
    // Carlo inside useMemo). Relax the purity/unused rules for that directory
    // only — the surrounding TypeScript spine stays fully linted.
    files: ["src/components/calculators/**/*.{js,jsx}"],
    rules: {
      "react-hooks/purity": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
