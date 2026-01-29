import { nextJsConfig } from "@facenet/eslint-config/next-js";

/**
 * ESLint configuration for Next.js web app
 * @type {import("eslint").Linter.Config}
 */
const eslintConfig = [
  ...nextJsConfig,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
